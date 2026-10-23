"use client";
import { useEffect, useRef, useState } from "react";
import { QuizResults } from "@/components/quiz-results";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { missedQuestions, shuffleRound } from "@/lib/practice";
import { scoreAttempt, type SelectedAnswer } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { QuizWithQuestions } from "@/server/services/quizzes";
import { submitQuiz } from "../actions/attempts";
import { AnswerOption, LETTERS } from "./answer-option";
import { PlayerTopBar } from "./player-top-bar";
import { QuestionHeading } from "./question-heading";
import { usePlayerKeys } from "./use-player-keys";

export type PlayerQuiz = Pick<QuizWithQuestions, "id" | "name" | "questions">;

type QuizPlayerProps = {
  quiz: PlayerQuiz;
  /** Where ✕ leads: the quiz's course, or the landing page for the sample quiz. */
  exitHref: string;
  /** Defaults to "Back to course", or "Back to home" for the sample quiz. */
  exitLabel?: string;
  /** The sample quiz has no database row, so its result is only shown, never saved. */
  isSample?: boolean;
  /** Starts with a practice round (questions already shuffled): its result is never saved. */
  practice?: boolean;
  /** Set when the quiz was made from only the first part of a long PDF. */
  truncated?: boolean;
};

/**
 * One question at a time: the user picks an answer, sees right away whether it was correct and why,
 * then moves on. The score is computed again on the server when the quiz is submitted.
 */
export function QuizPlayer({
  quiz,
  exitHref,
  exitLabel,
  isSample,
  practice = false,
  truncated,
}: QuizPlayerProps) {
  // The questions being played: the whole quiz, or a practice round of missed ones. `number`
  // counts the restarts, so focus can move to the first question of a new round.
  const [round, setRound] = useState({ questions: quiz.questions, practice, number: 0 });
  const { questions } = round;
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
    if (isSample || round.practice) return setResult(localResult);
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

  function start(nextQuestions: PlayerQuiz["questions"], nextPractice: boolean) {
    setRound({ questions: nextQuestions, practice: nextPractice, number: round.number + 1 });
    setIndex(0);
    setChosen([]);
    setSubmitting(false);
    setResult(null);
    setSaveError(null);
  }

  // A practice round is reshuffled each time, so positions can't be remembered.
  function retry() {
    start(round.practice ? shuffleRound(questions) : questions, round.practice);
  }

  function practiceMistakes() {
    start(shuffleRound(missedQuestions(questions, chosen)), true);
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
    if (index > 0 || round.number > 0) questionRef.current?.focus();
  }, [index, round.number]);

  usePlayerKeys({
    enabled: !answered && !result && !submitting,
    answers: question.answers,
    onAnswer: choose,
  });

  if (result) {
    return (
      <QuizResults
        score={result.score}
        total={result.total}
        questions={questions}
        chosen={chosen}
        saveError={saveError}
        practice={round.practice}
        missedCount={result.total - result.score}
        onRetry={retry}
        onPracticeMistakes={practiceMistakes}
        exitHref={exitHref}
        exitLabel={exitLabel ?? (isSample ? "Back to home" : "Back to course")}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <PlayerTopBar
        name={quiz.name}
        tag={round.practice ? "Practice · not saved" : undefined}
        exitHref={exitHref}
        exitLabel="Exit quiz"
        index={index}
        answered={chosen.length}
        total={questions.length}
      />

      <div className="mx-auto w-full max-w-180 px-4 pt-6 pb-16">
        {truncated ? (
          <p role="status" className="mb-4 text-sm text-muted-foreground">
            Only the first part of this long PDF was used.
          </p>
        ) : null}

        <QuestionHeading ref={questionRef}>{question.questionText}</QuestionHeading>

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
              <AnswerOption
                key={answer.id}
                index={i}
                text={answer.answerText}
                state={state}
                pressed={isChosen}
                disabled={answered}
                onClick={() => choose(answer.id)}
              />
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
                {submitting ? <Spinner /> : null}
                {isLast ? (submitting ? "Saving…" : "See results") : "Next question"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
