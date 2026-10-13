import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { listQuizzes } from "@/server/services/quizzes";
import { getSubmissionActivity, getUserMetrics } from "@/server/services/stats";
import { requireUser } from "@/server/session";
import { ActivityHeatmap } from "./activity-heatmap";
import { MetricCard } from "./metric-card";
import { QuizzesTable } from "./quizzes-table";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { id: userId } = await requireUser("/dashboard");

  const [quizzes, metrics, activity] = await Promise.all([
    listQuizzes(userId),
    getUserMetrics(userId),
    getSubmissionActivity(userId),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4">
      <PageHeading
        action={
          <Button className="gap-2" asChild>
            <Link href="/quizzes/new">
              <Plus className="size-4" aria-hidden />
              New quiz
            </Link>
          </Button>
        }
      >
        Dashboard
      </PageHeading>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
      <Card>
        <CardTitle>Activity</CardTitle>
        <ActivityHeatmap activity={activity} today={new Date().toISOString().slice(0, 10)} />
      </Card>
      <QuizzesTable quizzes={quizzes} />
    </div>
  );
}
