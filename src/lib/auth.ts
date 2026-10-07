import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import { db } from "@/db";
import { authAccounts, authSessions, authVerifications, rateLimits, users } from "@/db/schema";
import { env } from "@/lib/env";

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
