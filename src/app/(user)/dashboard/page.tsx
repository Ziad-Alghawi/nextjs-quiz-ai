import type { Metadata } from "next";
import { Zap } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { utcDate } from "@/lib/time";
import { listQuizzes } from "@/server/services/quizzes";
import { getAttemptActivity, getUserMetrics, summarizeActivity } from "@/server/services/stats";
import { requireAccount } from "@/server/session";
import { ActivityHeatmap } from "./activity-heatmap";
import { ActivityStats } from "./activity-stats";
import { MetricCard } from "./metric-card";
import { QuizzesTable } from "./quizzes-table";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const { id: userId } = await requireAccount("/dashboard");

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        action={
          <Button className="gap-2" asChild>
            <Link href="/quizzes/new">
              <Zap className="size-4" aria-hidden />
              Quick quiz
            </Link>
          </Button>
        }
      >
        Overview
      </PageHeading>
      {/* The heading shows right after the sign-in check; the stats stream in when they're loaded. */}
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent userId={userId} />
      </Suspense>
    </div>
  );
}

async function OverviewContent({ userId }: { userId: string }) {
  const [quizzes, stats, activity] = await Promise.all([
    listQuizzes(userId),
    getUserMetrics(userId),
    getAttemptActivity(userId),
  ]);
  const today = utcDate();

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Quizzes" value={stats.quizzes} />
        <MetricCard label="Questions" value={stats.questions} />
        <MetricCard label="Attempts" value={stats.attempts} />
        <MetricCard label="Average Score" value={stats.averagePercent} unit="%" />
      </div>
      <Card>
        <CardTitle>Activity</CardTitle>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <ActivityHeatmap activity={activity} today={today} />
          <ActivityStats {...summarizeActivity(activity, today)} />
        </div>
      </Card>
      <QuizzesTable quizzes={quizzes} />
    </>
  );
}

/** The shape of the stats, the activity card and the quiz table while they load. */
function OverviewSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Loading your overview…
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {["Quizzes", "Questions", "Attempts", "Average Score"].map((label) => (
          <Card key={label} className="gap-2 p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <Skeleton className="h-9 w-16" />
          </Card>
        ))}
      </div>
      <Card>
        <CardTitle>Activity</CardTitle>
        <Skeleton className="h-32 w-full" />
      </Card>
      <Card>
        <CardTitle>Your quizzes</CardTitle>
        <Skeleton className="h-48 w-full" />
      </Card>
    </>
  );
}
