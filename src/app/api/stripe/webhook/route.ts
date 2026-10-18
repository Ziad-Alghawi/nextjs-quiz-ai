import { NextResponse } from "next/server";
import Stripe from "stripe";
import { errorResponse } from "@/lib/api-response";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { setSubscribed } from "@/server/services/billing";

const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return errorResponse("Missing stripe signature", 400);
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return errorResponse("Invalid signature", 400);
  }

  switch (event.type) {
    // Sent when a subscription starts, changes (renewal, failed payment, cancellation) or ends.
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const { customer, status } = event.data.object;
      const customerId = typeof customer === "string" ? customer : customer.id;
      // The status alone decides: a deleted subscription arrives as "canceled", a failed renewal
      // as "past_due", and a checkout that is still waiting for payment as "incomplete".
      await setSubscribed(customerId, ACTIVE_STATUSES.has(status));
    }
  }

  return NextResponse.json({ received: true });
}
