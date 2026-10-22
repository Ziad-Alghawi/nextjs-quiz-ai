import "server-only";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import type { BillingInterval } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

/** Subscriptions in these states are over: they can't bill again. */
const ENDED_STATUSES = new Set<Stripe.Subscription.Status>(["canceled", "incomplete_expired"]);

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

const createPortalSession = (customer: string) =>
  getStripe().billingPortal.sessions.create({ customer, return_url: `${env.APP_URL}/billing` });

export async function createBillingPortalSession(userId: string) {
  return createPortalSession(await getOrCreateStripeCustomer(userId));
}

/**
 * Where Upgrade sends the user: Stripe Checkout for Pro billed per `interval` (the price comes from
 * server config only), or the billing portal when a subscription that can bill already exists. The
 * plan flag waits for the webhook, so without this check a second Upgrade would start a second
 * subscription.
 */
export async function getUpgradeUrl(userId: string, interval: BillingInterval) {
  const customer = await getOrCreateStripeCustomer(userId);
  for await (const subscription of getStripe().subscriptions.list({ customer, status: "all" })) {
    if (!ENDED_STATUSES.has(subscription.status)) return (await createPortalSession(customer)).url;
  }

  const prices = { month: env.STRIPE_PRICE_ID, year: env.STRIPE_YEARLY_PRICE_ID };
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: prices[interval], quantity: 1 }],
    allowed_payment_method_types: ["card"],
    success_url: `${env.APP_URL}/billing/payment/success`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}

/**
 * The date the user's Pro plan ends, or null while it renews. Read from Stripe when the page is
 * shown, so nothing extra is stored or kept in sync by the webhook.
 */
export async function getCancellationDate(userId: string) {
  const customerId = await getSavedCustomerId(userId);
  if (!customerId) return null;

  const { data } = await getStripe().subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });
  const [subscription] = data;
  if (!subscription?.cancel_at_period_end) return null;
  // Since API version 2025-03-31 the period belongs to the subscription items, not the subscription.
  return new Date(subscription.items.data[0].current_period_end * 1000);
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
      if (!ENDED_STATUSES.has(subscription.status)) {
        await getStripe().subscriptions.cancel(subscription.id);
      }
    }
  } catch (error) {
    // A customer deleted in the Stripe dashboard has no subscriptions left to cancel.
    if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") return;
    throw error;
  }
}
