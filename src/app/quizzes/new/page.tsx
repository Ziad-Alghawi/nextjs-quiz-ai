import type { Metadata } from "next";
import UploadDoc from "../UploadDoc";
import { startCheckout } from "@/app/actions/billing";
import { Card, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { PLANS } from "@/lib/plans";
import { getMonthlyUsage } from "@/server/services/usage";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "New quiz" };

// Quotas count calendar months in UTC (the database clock), so the reset is the 1st at 00:00 UTC.
const nextMonthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
};

export default async function NewQuizPage() {
  const user = await requireUser("/quizzes/new");
  const { plan, used, limit } = await getMonthlyUsage(user.id);
  const remaining = Math.max(limit - used, 0);
  const resetDate = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(nextMonthStart());

  return (
    <div className="flex flex-col flex-1">
      <main className="pt-11 flex flex-col text-center items-center gap-4 flex-1 mt-24">
        <h1 className="text-3xl font-bold">What do you want to be quizzed about today?</h1>

        {remaining > 0 ? (
          <>
            <UploadDoc />
            <p className="text-sm text-muted-foreground">
              {remaining} of {limit} quizzes left this month ({PLANS[plan].label} plan)
            </p>
          </>
        ) : (
          <p role="status">
            You&apos;ve used all {limit} quizzes of the {PLANS[plan].label} plan this month.
            {plan === "pro" && ` Your quota resets on ${resetDate}.`}
          </p>
        )}

        {plan === "free" && (
          <Card className="mt-4 w-full max-w-sm text-left">
            <CardTitle>Upgrade to Pro</CardTitle>
            <p className="text-sm text-muted-foreground">
              {PLANS.pro.monthlyQuizzes} quizzes a month instead of {PLANS.free.monthlyQuizzes}.
            </p>
            <form action={startCheckout}>
              <SubmitButton pendingText="Opening checkout…">Upgrade to Pro</SubmitButton>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}
