import { Check, X } from "lucide-react";
import type { SelectedAnswer } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type ReviewQuestion = {
  id: number;
  questionText: string;
  explanation: string | null;
  answers: { id: number; answerText: string; isCorrect: boolean }[];
};

/** Every question with the chosen answer, the right one when they differ, and the explanation. */
export function QuestionReview({
  questions,
  chosen,
}: {
  questions: ReviewQuestion[];
  chosen: SelectedAnswer[];
}) {
  return (
    <ol className="flex flex-col gap-4">
      {questions.map((question, index) => {
        const chosenId = chosen.find((answer) => answer.questionId === question.id)?.answerId;
        const picked = question.answers.find((answer) => answer.id === chosenId);
        const correct = question.answers.find((answer) => answer.isCorrect);
        const isRight = picked?.isCorrect === true;
        return (
          <li key={question.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md text-background",
                  isRight ? "bg-success" : "bg-destructive",
                )}
              >
                {isRight ? (
                  <Check className="size-4" aria-label="Correct" />
                ) : (
                  <X className="size-4" aria-label="Wrong" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium leading-snug wrap-break-word">
                  {index + 1}. {question.questionText}
                </h3>
                <dl className="mt-3 flex flex-col gap-2 text-sm">
                  {isRight ? null : (
                    <div>
                      <dt className="text-muted-foreground">Your answer</dt>
                      <dd className="wrap-break-word">{picked?.answerText ?? "Not answered"}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">
                      {isRight ? "Your answer, correct" : "Correct answer"}
                    </dt>
                    <dd className="wrap-break-word">{correct?.answerText}</dd>
                  </div>
                </dl>
                {question.explanation ? (
                  <p className="mt-3 rounded-md bg-muted p-3 text-sm leading-relaxed">
                    {question.explanation}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
