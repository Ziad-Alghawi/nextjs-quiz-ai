"use server";

import { redirect } from "next/navigation";
import { createBillingPortalSession, createCheckoutSession } from "@/server/services/billing";
import { requireUser } from "@/server/session";

export async function startCheckout() {
  const user = await requireUser("/billing");
  const session = await createCheckoutSession(user.id);
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  redirect(session.url);
}

export async function openBillingPortal() {
  const user = await requireUser("/billing");
  const session = await createBillingPortalSession(user.id);
  redirect(session.url);
}
