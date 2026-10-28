import { Play } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { QuizKindLabel } from "@/components/quiz-kind-label";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { getCourse } from "@/server/services/courses";
import type { listCourseAttempts } from "@/server/services/attempts";
import { QuizAttempts } from "./quiz-attempts";
import { ShareQuizButton } from "./share-quiz-button";

type Course = NonNullable<Awaited<ReturnType<typeof getCourse>>>;

/** The course's quizzes, newest first, each with Share (not exams), Start and its attempts. */
export function CourseQuizzes({
  quizzes,
  attempts,
  emptyText,
  quizAction,
}: {
  quizzes: Course["quizzes"];
  attempts: Awaited<ReturnType<typeof listCourseAttempts>>;
  emptyText: string;
  /** Another button beside Start, e.g. Move in the "My quizzes" folder. */
  quizAction?: (quiz: Course["quizzes"][number]) => ReactNode;
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
                    className="font-medium wrap-break-word text-primary underline-offset-4 hover:underline"
                  >
                    {quiz.name}
                  </Link>
                  <QuizKindLabel kind={quiz.kind} />
                  {quiz.description ? (
                    <p className="mt-0.5 text-sm text-muted-foreground">{quiz.description}</p>
                  ) : null}
                </div>
                {quiz.kind === "exam" ? null : <ShareQuizButton quiz={quiz} />}
                {quizAction?.(quiz)}
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
