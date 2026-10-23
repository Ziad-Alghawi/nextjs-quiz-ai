import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { PLANS } from "@/lib/plans";
import { getMonthlyUsage } from "@/server/services/usage";
import { requireUser } from "@/server/session";
import { QuickQuizForm } from "./quick-quiz-form";

export const metadata: Metadata = { title: "Quick quiz" };

// Quotas count calendar months in UTC (the database clock), so the reset is the 1st at 00:00 UTC.
const nextMonthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
};

export default async function QuickQuizPage() {
  const user = await requireUser("/quizzes/new");
  const { plan, used, limit } = await getMonthlyUsage(user.id);
  const remaining = Math.max(limit - used, 0);
  const resetDate = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(nextMonthStart());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeading>Quick quiz</PageHeading>

      <Card>
        <div className="flex flex-col gap-1">
          <CardTitle>Quiz from one PDF</CardTitle>
          <p className="text-sm text-muted-foreground">
            Saved in your &ldquo;My quizzes&rdquo; folder. To use several PDFs, add them as chapters
            of a course instead.
          </p>
        </div>
        {remaining > 0 ? (
          <QuickQuizForm plan={plan} remaining={remaining} />
        ) : (
          <p className="text-sm text-muted-foreground" role="status">
            You&apos;ve used all {limit} quizzes of the {PLANS[plan].label} plan this month. Your
            quota resets on {resetDate}. Review quizzes in your courses are still free.
          </p>
        )}
      </Card>

      {plan === "free" && (
        <Card>
          <CardTitle>Upgrade to Pro</CardTitle>
          <p className="text-sm text-muted-foreground">
            {PLANS.pro.monthlyQuizzes} quizzes a month instead of {PLANS.free.monthlyQuizzes}, and
            up to {PLANS.pro.questionCounts.at(-1)} questions per quiz.
          </p>
          {/* The billing page offers both Pro prices, monthly and yearly. */}
          <Button className="self-start" asChild>
            <Link href="/billing">Upgrade to Pro</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
