import { Play } from "lucide-react";
import Link from "next/link";
import { QuizKindLabel } from "@/components/quiz-kind-label";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { getCourse } from "@/server/services/courses";
import type { listCourseAttempts } from "@/server/services/attempts";
import { QuizAttempts } from "./quiz-attempts";

type Course = NonNullable<Awaited<ReturnType<typeof getCourse>>>;

/** The course's quizzes, newest first, each with a Start button and its attempts. */
export function CourseQuizzes({
  quizzes,
  attempts,
  emptyText,
}: {
  quizzes: Course["quizzes"];
  attempts: Awaited<ReturnType<typeof listCourseAttempts>>;
  emptyText: string;
}) {
  return (
    <Card className="gap-2">
      <CardTitle>Quizzes</CardTitle>
      {quizzes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="divide-y">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <div className="flex items-start gap-3 pt-3 pb-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/quizzes/${quiz.id}`}
                    className="font-medium text-primary underline-offset-4 wrap-break-word hover:underline"
                  >
                    {quiz.name}
                  </Link>
                  <QuizKindLabel kind={quiz.kind} />
                  {quiz.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{quiz.description}</p>
                  ) : null}
                </div>
                {/* Touch screens have no hover, so a visible button says where the quiz starts. */}
                <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
                  <Link href={`/quizzes/${quiz.id}`} aria-label={`Start ${quiz.name}`}>
                    <Play className="size-3.5" aria-hidden />
                    Start
                  </Link>
                </Button>
              </div>
              <QuizAttempts entry={attempts.get(quiz.id)} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
