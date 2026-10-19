"use client";
import { RotateCcw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type ComponentProps } from "react";
import { QuestionReview } from "@/components/question-review";
import { Button } from "@/components/ui/button";
import type { SelectedAnswer } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type QuizResultsProps = {
  score: number;
  total: number;
  questions: ComponentProps<typeof QuestionReview>["questions"];
  chosen: SelectedAnswer[];
  /** Set when the result could not be saved; the score is still shown. */
  saveError: string | null;
  onRetry: () => void;
  exitHref: string;
  exitLabel: string;
};

function verdict(percentage: number) {
  if (percentage === 100) return "Perfect score!";
  if (percentage >= 80) return "Great work.";
  if (percentage >= 50) return "Good start. The answers below show what to revisit.";
  return "Keep going. The answers below show what to revisit.";
}

/** The score, what to do next, and every question with the right answer and its explanation. */
export function QuizResults({
  score,
  total,
  questions,
  chosen,
  saveError,
  onRetry,
  exitHref,
  exitLabel,
}: QuizResultsProps) {
  const percentage = Math.round((score / total) * 100);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The questions above were scrolled out of view; announce the result from the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto w-full max-w-180 px-4 py-8">
      <section className="flex flex-col items-center rounded-xl border bg-card p-6 text-center sm:p-8">
        {percentage === 100 ? (
          <Image
            src="/images/owl-smiling.png"
            alt=""
            width={120}
            height={120}
            className="mb-2 size-24 sm:size-28"
          />
        ) : null}
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold outline-none sm:text-3xl">
          {score} of {total} correct
        </h1>
        <p
          className={cn(
            "mt-2 text-5xl font-bold tabular-nums",
            percentage >= 50 ? "text-success" : "text-destructive",
          )}
        >
          {percentage}%
        </p>
        <p className="mt-2 text-muted-foreground">{verdict(percentage)}</p>
        {saveError ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            Your result couldn&apos;t be saved. {saveError}
          </p>
        ) : null}
        <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button onClick={onRetry} className="gap-2">
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href={exitHref}>{exitLabel}</Link>
          </Button>
        </div>
      </section>

      <h2 className="mt-8 mb-4 text-lg font-semibold">Your answers</h2>
      <QuestionReview questions={questions} chosen={chosen} />
    </div>
  );
}
