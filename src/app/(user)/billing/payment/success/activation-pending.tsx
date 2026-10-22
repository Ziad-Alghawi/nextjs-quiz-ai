"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CHECK_EVERY_MS = 2000;
const MAX_CHECKS = 15;

/**
 * Stripe tells us about the payment with a webhook, which can arrive a moment after the customer is
 * back here. Re-fetches the page until the plan has changed, then says so if it takes too long.
 */
export function ActivationPending() {
  const router = useRouter();
  const [checks, setChecks] = useState(0);

  useEffect(() => {
    if (checks >= MAX_CHECKS) return;
    const timer = setTimeout(() => {
      router.refresh();
      setChecks((count) => count + 1);
    }, CHECK_EVERY_MS);
    return () => clearTimeout(timer);
  }, [checks, router]);

  if (checks >= MAX_CHECKS) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Activating Pro is taking longer than usual. Your payment went through; reload this page in a
        minute.
      </p>
    );
  }
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
      Payment received, activating Pro…
    </p>
  );
}
