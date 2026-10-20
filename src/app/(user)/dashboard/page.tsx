import type { Metadata } from "next";
import { Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { listQuizzes } from "@/server/services/quizzes";
import { getAttemptActivity, getUserMetrics, summarizeActivity } from "@/server/services/stats";
import { requireUser } from "@/server/session";
import { ActivityHeatmap } from "./activity-heatmap";
import { ActivityStats } from "./activity-stats";
import { MetricCard } from "./metric-card";
import { QuizzesTable } from "./quizzes-table";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const { id: userId } = await requireUser("/dashboard");

  const [quizzes, stats, activity] = await Promise.all([
    listQuizzes(userId),
    getUserMetrics(userId),
    getAttemptActivity(userId),
  ]);

  const today = new Date().toISOString().slice(0, 10);

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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Quizzes" value={stats.quizzes} />
        <MetricCard label="Questions" value={stats.questions} />
        <MetricCard label="Submissions" value={stats.attempts} />
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
    </div>
  );
}
