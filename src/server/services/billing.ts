import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

/** Sets the subscription flag of the user who owns this Stripe customer. */
export async function setSubscribed(stripeCustomerId: string, subscribed: boolean) {
  await db.update(users).set({ subscribed }).where(eq(users.stripeCustomerId, stripeCustomerId));
}

export async function isSubscribed(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return user?.subscribed ?? false;
}

/** The user's Stripe customer id; the customer is created and saved on first use. */
async function getOrCreateStripeCustomer(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (user?.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({ metadata: { dbId: userId } });
  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
  return customer.id;
}

/** A Stripe Checkout session for the Pro plan; the price comes from server config only. */
export async function createCheckoutSession(userId: string) {
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: await getOrCreateStripeCustomer(userId),
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    payment_method_types: ["card"],
    success_url: `${env.APP_URL}/billing/payment/success`,
  });
}

export async function createBillingPortalSession(userId: string) {
  return stripe.billingPortal.sessions.create({
    customer: await getOrCreateStripeCustomer(userId),
    return_url: `${env.APP_URL}/billing`,
  });
}
