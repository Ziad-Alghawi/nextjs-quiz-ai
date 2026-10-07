import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Sets the subscription flag of the user who owns this Stripe customer. */
export async function setSubscribed(stripeCustomerId: string, subscribed: boolean) {
  await db.update(users).set({ subscribed }).where(eq(users.stripeCustomerId, stripeCustomerId));
}

export async function isSubscribed(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return user?.subscribed ?? false;
}
