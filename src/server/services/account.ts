import "server-only";
import { eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { authAccounts, rateLimits, users } from "@/db/schema";

const EXISTING_ACCOUNT_EMAIL_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Whether the "you already have an account" email may go to this user now: at most one per
 * interval, so repeated sign-ups (from any number of IPs) can't flood the owner's inbox. One upsert
 * on Better Auth's rate-limit table: the row is only claimed when the last email is old enough, so
 * parallel sign-ups can't both send.
 */
export async function claimExistingAccountEmail(userId: string) {
  const now = Date.now();
  const claimed = await db
    .insert(rateLimits)
    .values({
      id: crypto.randomUUID(),
      key: `existing-account-email:${userId}`,
      count: 1,
      lastRequest: now,
    })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: { count: 1, lastRequest: now },
      setWhere: lt(rateLimits.lastRequest, now - EXISTING_ACCOUNT_EMAIL_INTERVAL_MS),
    })
    .returning({ id: rateLimits.id });
  return claimed.length > 0;
}

export async function updateName(userId: string, name: string) {
  await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Which ways the user can sign in: email + password, Google, or both. */
export async function getSignInMethods(userId: string) {
  const accounts = await db
    .select({ providerId: authAccounts.providerId, password: authAccounts.password })
    .from(authAccounts)
    .where(eq(authAccounts.userId, userId));

  return {
    // Better Auth stores the password login as a "credential" account.
    password: accounts.some((a) => a.providerId === "credential" && a.password !== null),
    google: accounts.some((a) => a.providerId === "google"),
  };
}
