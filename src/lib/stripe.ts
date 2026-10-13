import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | undefined;

// Created on first use, not on import: the build loads route modules without secrets, and the
// Stripe constructor throws without a key.
export function getStripe() {
  client ??= new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-09-30.endive",
    typescript: true,
  });
  return client;
}
