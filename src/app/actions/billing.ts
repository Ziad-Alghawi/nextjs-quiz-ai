"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { BILLING_INTERVALS } from "@/lib/plans";
import { createBillingPortalSession, createCheckoutSession } from "@/server/services/billing";
import { requireUser } from "@/server/session";

const checkoutSchema = z.object({ interval: z.enum(BILLING_INTERVALS) });

export async function startCheckout(formData: FormData) {
  const user = await requireUser("/billing");
  const { interval } = checkoutSchema.parse({ interval: formData.get("interval") });
  const session = await createCheckoutSession(user.id, interval);
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  redirect(session.url);
}

export async function openBillingPortal() {
  const user = await requireUser("/billing");
  const session = await createBillingPortalSession(user.id);
  redirect(session.url);
}
