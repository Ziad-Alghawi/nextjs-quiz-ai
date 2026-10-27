import type { Metadata } from "next";
import { Suspense } from "react";
import { PricingCards } from "@/components/pricing-cards";
import { Card, CardTitle } from "@/components/ui/card";
import { PageColumn } from "@/components/ui/page-column";
import { PageHeading } from "@/components/ui/page-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { SubmitButton } from "@/components/ui/submit-button";
import { openBillingPortal } from "@/app/actions/billing";
import { PLANS, PRO_LABELS } from "@/lib/plans";
import { getSubscriptionSummary } from "@/server/services/billing";
import { getMonthlyUsage } from "@/server/services/usage";
import { requireAccount } from "@/server/session";

export const metadata: Metadata = { title: "Billing" };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export default async function BillingPage() {
  const user = await requireAccount("/billing");
  const { plan, used, limit } = await getMonthlyUsage(user.id);

  return (
    <PageColumn>
      <PageHeading>Billing</PageHeading>
      <Card>
        {plan === "pro" ? (
          // Pro's renewal date comes from Stripe; the rest of the page doesn't wait for it.
          <Suspense fallback={<Skeleton className="h-7 w-72 max-w-full" />}>
            <ProPlanTitle userId={user.id} />
          </Suspense>
        ) : (
          <CardTitle>{PLANS.free.label} plan</CardTitle>
        )}
        <p className="text-sm text-muted-foreground">
          {used} of {limit} quizzes used this month.
        </p>
        {plan === "pro" ? (
          <form action={openBillingPortal}>
            <SubmitButton pendingText="Please wait…">Manage subscription</SubmitButton>
          </form>
        ) : null}
      </Card>
      {plan === "free" ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Upgrade to Pro</h2>
          <PricingCards actions={{ free: "current", month: "checkout", year: "checkout" }} />
        </section>
      ) : null}
      {/* Stripe stays in test mode on the live site: this is a portfolio project. */}
      <p className="text-sm text-muted-foreground">
        Payments are in test mode, use card{" "}
        <span className="whitespace-nowrap">4242 4242 4242 4242</span>.
      </p>
    </PageColumn>
  );
}

async function ProPlanTitle({ userId }: { userId: string }) {
  const subscription = await getSubscriptionSummary(userId);
  return (
    <CardTitle>
      {subscription
        ? `${PRO_LABELS[subscription.interval]} · ${subscription.cancels ? "cancels" : "renews"} on ${dateFormat.format(subscription.periodEnd)}`
        : `${PLANS.pro.label} plan`}
    </CardTitle>
  );
}
