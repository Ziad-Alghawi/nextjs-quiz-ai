import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import { db } from "@/db";
import { authAccounts, authSessions, authVerifications, rateLimits, users } from "@/db/schema";
import { env } from "@/lib/env";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/validations/auth";

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
  },
  // On by default in production only. Limits are per client IP (x-forwarded-for, which Vercel sets
  // itself) and path. Counters live in Postgres because serverless instances don't share memory.
  rateLimit: {
    storage: "database",
    customRules: {
      // Slows down password guessing; each attempt also costs a scrypt hash on the server.
      "/sign-in/email": { window: 5 * 60, max: 5 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
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
    // Lets Server Actions set auth cookies; Better Auth requires it to be the last plugin.
    nextCookies(),
  ],
});
