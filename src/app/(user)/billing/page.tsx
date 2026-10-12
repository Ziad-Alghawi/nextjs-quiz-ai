import type { Metadata } from "next";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { SubmitButton } from "@/components/ui/submit-button";
import { openBillingPortal, startCheckout } from "@/app/actions/billing";
import { PLANS } from "@/lib/plans";
import { getMonthlyUsage } from "@/server/services/usage";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const user = await requireUser("/billing");
  const { plan, used, limit } = await getMonthlyUsage(user.id);

  return (
    <div className="flex flex-col gap-6 p-4">
      <PageHeading>Billing</PageHeading>
      <Card>
        <CardTitle>{PLANS[plan].label} plan</CardTitle>
        <p className="text-sm text-muted-foreground">
          {used} of {limit} quizzes used this month.
        </p>
        {plan === "free" ? (
          <form action={startCheckout}>
            <SubmitButton pendingText="Opening checkout…">
              Upgrade to Pro for {PLANS.pro.monthlyQuizzes} quizzes a month
            </SubmitButton>
          </form>
        ) : (
          <form action={openBillingPortal}>
            <SubmitButton pendingText="Please wait…">Manage subscription</SubmitButton>
          </form>
        )}
      </Card>
    </div>
  );
}
