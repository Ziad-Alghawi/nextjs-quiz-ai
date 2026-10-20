import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { QuestionReview } from "@/components/question-review";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { scorePercent } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { attemptIdSchema } from "@/lib/validations/quiz";
import { getAttempt } from "@/server/services/attempts";
import { getQuizWithQuestions } from "@/server/services/quizzes";
import { requireUser } from "@/server/session";

type Props = { params: Promise<{ attemptId: string }> };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });

// The title and the page both need the attempt; cache() runs the lookups once per request.
const loadAttempt = cache(async (attemptId: string) => {
  const user = await requireUser(`/attempts/${attemptId}`);

  const id = attemptIdSchema.safeParse(attemptId);
  if (!id.success) notFound();

  // Someone else's attempt is a 404 as well, so attempt ids can't be probed.
  const attempt = await getAttempt(user.id, id.data);
  if (!attempt) notFound();
  const quiz = await getQuizWithQuestions(attempt.quizId, user.id);
  if (!quiz) notFound();
  return { attempt, quiz };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quiz } = await loadAttempt((await params).attemptId);
  return { title: `Attempt at ${quiz.name}` };
}

export default async function AttemptPage({ params }: Props) {
  const { attempt, quiz } = await loadAttempt((await params).attemptId);
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
