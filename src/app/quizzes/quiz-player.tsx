"use client";
import { Check, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { QuizResults } from "@/components/quiz-results";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { scoreAttempt, type SelectedAnswer } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { QuizWithQuestions } from "@/server/services/quizzes";
import { submitQuiz } from "../actions/submitQuiz";

export type PlayerQuiz = Pick<QuizWithQuestions, "id" | "name" | "questions">;

type QuizPlayerProps = {
  quiz: PlayerQuiz;
  /** Where ✕ leads: the quiz's course, or the landing page for the sample quiz. */
  exitHref: string;
  /** The sample quiz has no database row, so its result is only shown, never saved. */
  isSample?: boolean;
  /** Set when the quiz was made from only the first part of a long PDF. */
  truncated?: boolean;
};

const LETTERS = "ABCDEF";

/**
 * One question at a time: the user picks an answer, sees right away whether it was correct and why,
 * then moves on. The score is computed again on the server when the quiz is submitted.
 */
export function QuizPlayer({ quiz, exitHref, isSample, truncated }: QuizPlayerProps) {
  const { questions } = quiz;
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<SelectedAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  // Set when the result could not be saved; the score is still shown.
  const [saveError, setSaveError] = useState<string | null>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const question = questions[index];
  const chosenId = chosen.find((answer) => answer.questionId === question.id)?.answerId;
  const answered = chosenId !== undefined;
  const isLast = index === questions.length - 1;
  const correctIndex = question.answers.findIndex((answer) => answer.isCorrect);
  const answeredRight = answered && question.answers[correctIndex]?.id === chosenId;

  function choose(answerId: number) {
    if (answered) return;
    setChosen((current) => [...current, { questionId: question.id, answerId }]);
  }

  async function finish() {
    const localResult = scoreAttempt(questions, chosen);
    if (isSample) return setResult(localResult);
    setSubmitting(true);
    try {
      const saved = await submitQuiz({ quizId: quiz.id, answers: chosen });
      if (saved.status === "saved") return setResult(saved);
      setSaveError(saved.error);
    } catch {
      setSaveError("Please try again later.");
    }
    // Not saved, but the user still sees how they did.
    setResult(localResult);
  }

  function retry() {
    setIndex(0);
    setChosen([]);
    setSubmitting(false);
    setResult(null);
    setSaveError(null);
  }

  function next() {
    if (isLast) return void finish();
    setIndex(index + 1);
    // On phones the next question would otherwise start below the fold.
    window.scrollTo({ top: 0 });
  }

  // Keyboard users and screen readers continue where the content changed; with the focus on Next,
  // Enter moves on.
  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);
  useEffect(() => {
    if (index > 0) questionRef.current?.focus();
  }, [index]);

  // 1-4 picks an answer.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || result || submitting) return;
      const number = Number(event.key);
      if (!answered && Number.isInteger(number) && number >= 1) {
        const answer = question.answers[number - 1];
        if (answer) choose(answer.id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (result) {
    return (
      <QuizResults
        score={result.score}
        total={result.total}
        questions={questions}
        chosen={chosen}
        saveError={saveError}
        onRetry={retry}
        exitHref={exitHref}
        exitLabel={isSample ? "Back to home" : "Back to course"}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-180 items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="-ml-2 shrink-0" asChild>
            <Link href={exitHref} aria-label="Exit quiz">
              <X className="size-5" aria-hidden />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-medium">{quiz.name}</h1>
            <div className="mt-1.5 flex items-center gap-3">
              <Progress
                value={(chosen.length / questions.length) * 100}
                label="Quiz progress"
                className="h-2"
              />
              <span className="shrink-0 text-sm text-muted-foreground">
                Question {index + 1} of {questions.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-180 px-4 pt-6 pb-16">
        {truncated ? (
          <p role="status" className="mb-4 text-sm text-muted-foreground">
            Only the first part of this long PDF was used.
          </p>
        ) : null}

        <h2
          ref={questionRef}
          tabIndex={-1}
          className="text-xl font-semibold leading-snug wrap-break-word outline-none sm:text-2xl"
        >
          {question.questionText}
        </h2>

        <div role="group" aria-label="Answers" className="mt-6 flex flex-col gap-3">
          {question.answers.map((answer, i) => {
            const isChosen = answer.id === chosenId;
            const state = !answered
              ? "open"
              : answer.isCorrect
                ? "correct"
                : isChosen
                  ? "wrong"
                  : "other";
            return (
              <button
                key={answer.id}
                type="button"
                disabled={answered}
                aria-pressed={isChosen}
                onClick={() => choose(answer.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border-2 bg-card px-4 py-3 text-left transition-colors",
                  state === "open" && "border-input hover:border-primary hover:bg-accent",
                  state === "correct" && "border-success bg-success/10",
                  state === "wrong" && "border-destructive bg-destructive/10",
                  state === "other" && "border-input opacity-60",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md border text-sm font-semibold",
                    state === "correct" && "border-success bg-success text-background",
                    state === "wrong" && "border-destructive bg-destructive text-background",
                  )}
                >
                  {state === "correct" ? (
                    <Check className="size-4" />
                  ) : state === "wrong" ? (
                    <X className="size-4" />
                  ) : (
                    LETTERS[i]
                  )}
                </span>
                <span className="min-w-0 flex-1 pt-0.5 wrap-break-word">{answer.answerText}</span>
              </button>
            );
          })}
        </div>

        <div aria-live="polite">
          {answered ? (
            <div className="mt-6 flex flex-col gap-4">
              <div className="rounded-lg bg-muted p-4">
                <p
                  className={cn(
                    "font-semibold",
                    answeredRight ? "text-success" : "text-destructive",
                  )}
                >
                  {answeredRight
                    ? "Correct!"
                    : `Not quite. The answer is ${LETTERS[correctIndex]}.`}
                </p>
                {question.explanation ? (
                  <p className="mt-1 text-sm leading-relaxed">{question.explanation}</p>
                ) : null}
              </div>
              <Button
                ref={nextRef}
                onClick={next}
                disabled={submitting}
                className="w-full sm:w-auto sm:self-end"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {isLast ? (submitting ? "Saving…" : "See results") : "Next question"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
