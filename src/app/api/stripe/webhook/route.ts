import Stripe from "stripe";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { setSubscribed } from "@/server/services/billing";

// Sent when a subscription starts, changes (renewal, failed payment, cancellation) or ends.
const subscriptionEvents = new Set<Stripe.Event.Type>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (subscriptionEvents.has(event.type)) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    // The status alone decides: a deleted subscription arrives as "canceled", a failed renewal
    // as "past_due", and a checkout that is still waiting for payment as "incomplete".
    await setSubscribed(customerId, ACTIVE_STATUSES.has(subscription.status));
  }

  return Response.json({ received: true });
}
