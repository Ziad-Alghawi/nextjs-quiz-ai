"use client";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ExamPaper } from "@/lib/exam";
import { pluralize } from "@/lib/pluralize";
import { cn } from "@/lib/utils";
import { submitQuiz } from "../actions/attempts";
import { AnswerOption } from "./answer-option";
import { PlayerTopBar } from "./player-top-bar";

type ExamPlayerProps = {
  exam: ExamPaper;
  /** Where ✕ leads: the exam's course. */
  exitHref: string;
};

/**
 * An exam without feedback: the user moves between questions and can change answers until they
 * finish. The browser never knows the correct answers; the server scores the attempt and the review
 * page shows them afterwards.
 */
export function ExamPlayer({ exam, exitHref }: ExamPlayerProps) {
  const router = useRouter();
  const { questions } = exam;
  const [index, setIndex] = useState(0);
  // The chosen answer id by question id.
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // The first question isn't focused on load; only after moving.
  const movedRef = useRef(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.keys(chosen).length;
  const unanswered = questions.length - answeredCount;

  function choose(answerId: number) {
    setChosen((current) => ({ ...current, [question.id]: answerId }));
    // With the focus on Next, Enter moves on.
    nextRef.current?.focus();
  }

  function goTo(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    movedRef.current = true;
    setIndex(nextIndex);
    // On phones the next question would otherwise start below the fold.
    window.scrollTo({ top: 0 });
  }

  async function finish() {
    setSubmitting(true);
    setError(null);
    try {
      const answers = Object.entries(chosen).map(([questionId, answerId]) => ({
        questionId: Number(questionId),
        answerId,
      }));
      const saved = await submitQuiz({ quizId: exam.id, answers });
      // The review page shows the score and the correct answers; the buttons stay disabled until
      // it has loaded.
      if (saved.status === "saved") return router.push(`/attempts/${saved.attemptId}`);
      setError(saved.error);
    } catch {
      setError("Please try again later.");
    }
    // The answers stay on the screen, so the user can finish again.
    setSubmitting(false);
    setConfirming(false);
  }

  // Keyboard users and screen readers continue at the new question.
  useEffect(() => {
    if (movedRef.current) questionRef.current?.focus();
  }, [index]);

  // 1-4 picks an answer, the arrow keys move between questions.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || confirming || submitting) return;
      if (event.key === "ArrowRight") return goTo(index + 1);
      if (event.key === "ArrowLeft") return goTo(index - 1);
      const number = Number(event.key);
      if (Number.isInteger(number) && number >= 1) {
        const answer = question.answers[number - 1];
        if (answer) choose(answer.id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="flex flex-col">
      <PlayerTopBar
        name={exam.name}
        tag="Exam"
        exitHref={exitHref}
        exitLabel="Exit exam"
        index={index}
        answered={answeredCount}
        total={questions.length}
      />

      <div className="mx-auto w-full max-w-180 px-4 pt-6 pb-16">
        <h2
          ref={questionRef}
          tabIndex={-1}
          className="text-xl font-semibold leading-snug wrap-break-word outline-none sm:text-2xl"
        >
          {question.questionText}
        </h2>

        <div role="group" aria-label="Answers" className="mt-6 flex flex-col gap-3">
          {question.answers.map((answer, i) => {
            const isChosen = chosen[question.id] === answer.id;
            return (
              <AnswerOption
                key={answer.id}
                index={i}
                text={answer.answerText}
                state={isChosen ? "selected" : "open"}
                pressed={isChosen}
                disabled={submitting}
                onClick={() => choose(answer.id)}
              />
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={() => goTo(index - 1)}
            disabled={index === 0 || submitting}
            className="gap-2"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Previous
          </Button>
          <Button
            ref={nextRef}
            onClick={() => (isLast ? setConfirming(true) : goTo(index + 1))}
            disabled={submitting}
            className="ml-auto gap-2"
          >
            {isLast ? "Finish exam" : "Next question"}
            {isLast ? null : <ArrowRight className="size-4" aria-hidden />}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            Your answers couldn&apos;t be saved. {error}
          </p>
        ) : null}

        <nav aria-label="Questions" className="mt-10 border-t pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium">Questions</h2>
            <span className="text-sm text-muted-foreground">
              {answeredCount} of {questions.length} answered
            </span>
          </div>
          <ol className="mt-3 flex flex-wrap gap-2">
            {questions.map((item, i) => {
              const isAnswered = chosen[item.id] !== undefined;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    disabled={submitting}
                    aria-current={i === index ? "step" : undefined}
                    aria-label={`Question ${i + 1}, ${isAnswered ? "answered" : "not answered"}`}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md border text-sm font-medium tabular-nums transition-colors hover:border-primary",
                      isAnswered && "border-primary bg-primary/10 text-primary",
                      i === index && "ring-2 ring-ring ring-offset-2 ring-offset-background",
                    )}
                  >
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <Button
            variant="outline"
            onClick={() => setConfirming(true)}
            disabled={submitting}
            className="mt-6 w-full sm:w-auto"
          >
            Finish exam
          </Button>
        </nav>
      </div>

      <Dialog open={confirming} onClose={() => setConfirming(false)} label="Finish the exam">
        <div className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold">Finish the exam?</h2>
          <p className="text-sm">
            {unanswered > 0
              ? `${pluralize(unanswered, "question")} ${unanswered === 1 ? "is" : "are"} not answered and will count as wrong. `
              : null}
            You can&apos;t change your answers afterwards.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
              Keep going
            </Button>
            <Button onClick={finish} disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {submitting ? "Saving…" : "Finish exam"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
