import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { authAccounts, users } from "@/db/schema";

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
