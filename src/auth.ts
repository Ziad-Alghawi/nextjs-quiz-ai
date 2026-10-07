import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db/index";
import { accounts, sessions, users, verificationTokens } from "./db/schema";
import { env } from "./lib/env";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: env.AUTH_SECRET,
  // Our schema's tables, not the adapter's built-in copies, so user columns like `subscribed` stay in one place.
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // With database sessions this receives the full session row (incl. the session token) and the
    // full user record (incl. billing fields); return only what the client is allowed to see.
    session({ session, user }) {
      return {
        expires: session.expires,
        user: { id: user.id, name: user.name, email: user.email, image: user.image },
      };
    },
  },
});
