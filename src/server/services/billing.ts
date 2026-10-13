import "server-only";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

/** Sets the subscription flag of the user who owns this Stripe customer. */
export async function setSubscribed(stripeCustomerId: string, subscribed: boolean) {
  await db.update(users).set({ subscribed }).where(eq(users.stripeCustomerId, stripeCustomerId));
}

export async function isSubscribed(userId: string) {
  const user = await db.query.users.findFirst({
    columns: { subscribed: true },
    where: eq(users.id, userId),
  });
  return user?.subscribed ?? false;
}

async function getSavedCustomerId(userId: string) {
  const user = await db.query.users.findFirst({
    columns: { stripeCustomerId: true },
    where: eq(users.id, userId),
  });
  return user?.stripeCustomerId ?? null;
}

/** The user's Stripe customer id; the customer is created and saved on first use. */
async function getOrCreateStripeCustomer(userId: string) {
  const savedId = await getSavedCustomerId(userId);
  if (savedId) return savedId;

  // Two requests at once (a double click) would both find no saved id. With the same idempotency
  // key, Stripe returns the first customer to the second request instead of creating another one.
  const customer = await getStripe().customers.create(
    { metadata: { dbId: userId } },
    { idempotencyKey: `customer-${userId}` },
  );
  await db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, userId));
  return customer.id;
}

/** A Stripe Checkout session for the Pro plan; the price comes from server config only. */
export async function createCheckoutSession(userId: string) {
  return getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: await getOrCreateStripeCustomer(userId),
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    allowed_payment_method_types: ["card"],
    success_url: `${env.APP_URL}/billing/payment/success`,
  });
}

export async function createBillingPortalSession(userId: string) {
  return getStripe().billingPortal.sessions.create({
    customer: await getOrCreateStripeCustomer(userId),
    return_url: `${env.APP_URL}/billing`,
  });
}

/**
 * Ends the user's subscriptions right away, before the account is deleted. Throws when Stripe
 * fails, so the account isn't deleted while a subscription keeps billing.
 */
export async function cancelSubscriptions(userId: string) {
  const customerId = await getSavedCustomerId(userId);
  if (!customerId) return;

  const subscriptions = getStripe().subscriptions.list({
    customer: customerId,
    status: "all",
  });
  try {
    for await (const subscription of subscriptions) {
      if (subscription.status !== "canceled" && subscription.status !== "incomplete_expired") {
        await getStripe().subscriptions.cancel(subscription.id);
      }
    }
  } catch (error) {
    // A customer deleted in the Stripe dashboard has no subscriptions left to cancel.
    if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") return;
    throw error;
  }
}
