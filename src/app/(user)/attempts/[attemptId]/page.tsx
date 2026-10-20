import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { loadAttempt } from "@/app/attempts/load-attempt";
import { QuestionReview } from "@/components/question-review";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { scorePercent } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ attemptId: string }> };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { attemptId } = await params;
  const { quiz } = await loadAttempt(attemptId, `/attempts/${attemptId}`);
  return { title: `Attempt at ${quiz.name}` };
}

export default async function AttemptPage({ params }: Props) {
  const { attemptId } = await params;
  const { attempt, quiz } = await loadAttempt(attemptId, `/attempts/${attemptId}`);
  const percentage = scorePercent(attempt.score, attempt.totalQuestions);

  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Attempt on {dateFormat.format(attempt.createdAt)}
        </p>
        <PageHeading>{quiz.name}</PageHeading>
        <p className="text-lg">
          <span className="font-semibold">
            {attempt.score} of {attempt.totalQuestions} correct
          </span>{" "}
          ·{" "}
          <span
            className={cn(
              "font-semibold tabular-nums",
              percentage >= 50 ? "text-success" : "text-destructive",
            )}
          >
            {percentage}%
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="gap-2">
          <Link href={`/quizzes/${quiz.id}`}>
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/courses/${quiz.courseId}`}>Back to course</Link>
        </Button>
      </div>

      {/* Attempts saved before the chosen answers were stored only have their score. */}
      {attempt.answers.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Your answers</h2>
          <QuestionReview questions={quiz.questions} chosen={attempt.answers} />
        </section>
      ) : (
        <p className="rounded-lg border bg-card p-4 text-muted-foreground">
          Detailed review isn&apos;t available for this attempt.
        </p>
      )}
    </div>
  );
}
