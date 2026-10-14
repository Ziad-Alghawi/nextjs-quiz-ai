import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { customSession, emailOTP } from "better-auth/plugins";
import { after } from "next/server";
import { db } from "@/db";
import { authAccounts, authSessions, authVerifications, rateLimits, users } from "@/db/schema";
import { env } from "@/lib/env";
import {
  OTP_EXPIRES_IN_MINUTES,
  OTP_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/validations/auth";
import { getSignInMethods } from "@/server/services/account";
import { cancelSubscriptions } from "@/server/services/billing";
import { sendEmail } from "@/server/services/mail";
import { consumeRateLimit } from "@/server/services/rate-limit";

// The code emails the app sends; the plugin's other code types are disabled below.
const otpEmails: Partial<Record<string, { subject: string; ignoreNote: string }>> = {
  "forget-password": {
    subject: "Your Quiz AI password reset code",
    ignoreNote:
      "If you didn't ask to reset your password, you can ignore this email; your password stays the same.",
  },
  "change-email": {
    subject: "Confirm your new Quiz AI email address",
    ignoreNote:
      "If you didn't ask to use this address for Quiz AI, you can ignore this email; nothing changes.",
  },
};

/** For a sign-up with an email that already has an account: how its owner can get in. */
function existingAccountEmail(methods: { password: boolean; google: boolean }) {
  const signIn = `${env.APP_URL}/sign-in`;
  const reset = `${env.APP_URL}/forgot-password`;
  const howToSignIn = methods.password
    ? [
        `Sign in with your password: ${signIn}`,
        `Forgot it? Reset it with an email code: ${reset}`,
        ...(methods.google ? ["You can also choose Continue with Google there."] : []),
      ]
    : [
        `Your account uses Google sign-in. Choose Continue with Google on ${signIn}`,
        `To sign in with a password too, set one with an email code: ${reset}`,
      ];
  return [
    "Someone, probably you, just tried to create a Quiz AI account with this email address. You already have an account, so nothing was created or changed.",
    ...howToSignIn,
    "If this wasn't you, you can ignore this email.",
  ].join("\n\n");
}

export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      account: authAccounts,
      session: authSessions,
      verification: authVerifications,
      rateLimit: rateLimits,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    // Without automatic sign-in, signing up with a registered email gets the same response as a new
    // account, so the sign-up form can't be used to check who has an account.
    autoSignIn: false,
    // A reset is for when someone else may know the password, so sign out everywhere.
    revokeSessionsOnPasswordReset: true,
    // The generic answer above creates nothing for a registered email, so its owner would be stuck at
    // "invalid email or password" (e.g. an account that only signs in with Google). The email reaches
    // only the owner, so the page still reveals nothing. Sent in the background like the codes.
    onExistingUserSignUp: async ({ user }) => {
      // At most one per 15 minutes, so repeated sign-ups (from any number of IPs) can't flood the inbox.
      if (!(await consumeRateLimit(`existing-account-email:${user.id}`, 1, 15 * 60 * 1000))) return;
      await sendEmail({
        to: user.email,
        subject: "You already have a Quiz AI account",
        text: existingAccountEmail(await getSignInMethods(user.id)),
      });
    },
  },
  // On by default in production only. Limits are per client IP (x-forwarded-for, which Vercel sets
  // itself) and path. Counters live in Postgres because serverless instances don't share memory.
  rateLimit: {
    storage: "database",
    customRules: {
      // Slows down password guessing; each attempt also costs a scrypt hash on the server.
      "/sign-in/email": { window: 5 * 60, max: 5 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
      // Asks for the current password, so someone with a stolen session could guess it here.
      "/change-password": { window: 5 * 60, max: 5 },
      "/delete-user": { window: 5 * 60, max: 5 },
      // Each request sends an email, and the Gmail account has a daily sending limit.
      "/email-otp/request-password-reset": { window: 15 * 60, max: 3 },
      "/email-otp/request-email-change": { window: 15 * 60, max: 3 },
    },
  },
  // The email OTP plugin also offers passwordless sign-in, email verification and a deprecated
  // reset endpoint; the app only uses codes for password reset and email change.
  disabledPaths: [
    "/sign-in/email-otp",
    "/email-otp/send-verification-otp",
    "/email-otp/check-verification-otp",
    "/email-otp/verify-email",
    "/forget-password/email-otp",
  ],
  advanced: {
    // Emails are sent after the response, so an existing account doesn't answer noticeably slower
    // than an unknown email. after() keeps the serverless function alive until the email is sent.
    backgroundTasks: { handler: after },
  },
  user: {
    deleteUser: {
      enabled: true,
      // Quizzes, results and sessions go with the user row (ON DELETE CASCADE); Stripe doesn't.
      beforeDelete: async (user) => cancelSubscriptions(user.id),
    },
  },
  socialProviders: {
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  },
  plugins: [
    // /api/auth/get-session would otherwise return the session token itself, which the httpOnly
    // cookie is meant to keep away from JavaScript; expose only what the app needs.
    customSession(async ({ user, session }) => ({
      user: { id: user.id, name: user.name, email: user.email, image: user.image ?? null },
      session: { expiresAt: session.expiresAt },
    })),
    emailOTP({
      otpLength: OTP_LENGTH,
      expiresIn: OTP_EXPIRES_IN_MINUTES * 60,
      allowedAttempts: 3,
      // Only a hash is stored, so a database leak doesn't expose usable codes.
      storeOTP: "hashed",
      disableSignUp: true,
      // The code goes to the new address, which proves the user can receive mail there.
      changeEmail: { enabled: true },
      async sendVerificationOTP({ email, otp, type }) {
        const purpose = otpEmails[type];
        if (!purpose) throw new Error(`Unexpected email code type: ${type}`);
        await sendEmail({
          to: email,
          subject: purpose.subject,
          text: [
            `Your code: ${otp}`,
            `It expires in ${OTP_EXPIRES_IN_MINUTES} minutes.`,
            purpose.ignoreNote,
          ].join("\n\n"),
        });
      },
    }),
    // Lets Server Actions set auth cookies; Better Auth requires it to be the last plugin.
    nextCookies(),
  ],
});
