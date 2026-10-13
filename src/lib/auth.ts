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
import { cancelSubscriptions } from "@/server/services/billing";
import { sendEmail } from "@/server/services/mail";

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
