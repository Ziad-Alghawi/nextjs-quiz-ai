import type { Metadata } from "next";
import { PricingCards } from "@/components/pricing-cards";
import { Card, CardTitle } from "@/components/ui/card";
import { PageColumn } from "@/components/ui/page-column";
import { PageHeading } from "@/components/ui/page-heading";
import { SubmitButton } from "@/components/ui/submit-button";
import { openBillingPortal } from "@/app/actions/billing";
import { PLANS } from "@/lib/plans";
import { getCancellationDate } from "@/server/services/billing";
import { getMonthlyUsage } from "@/server/services/usage";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Billing" };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export default async function BillingPage() {
  const user = await requireUser("/billing");
  const { plan, used, limit } = await getMonthlyUsage(user.id);
  const cancelsOn = plan === "pro" ? await getCancellationDate(user.id) : null;

  return (
    <PageColumn>
      <PageHeading>Billing</PageHeading>
      <Card>
        <CardTitle>
          {PLANS[plan].label}
          {cancelsOn ? `, cancels on ${dateFormat.format(cancelsOn)}` : " plan"}
        </CardTitle>
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
