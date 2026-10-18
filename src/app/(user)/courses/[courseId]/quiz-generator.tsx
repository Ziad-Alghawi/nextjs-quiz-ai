"use client";
import { Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { NETWORK_ERROR, readGenerationResponse } from "@/lib/generation-response";
import { DEFAULT_QUESTION_COUNT, PLANS, QUESTION_COUNTS, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

type QuizGeneratorProps = {
  courseId: number;
  chapters: { id: number; name: string }[];
  plan: PlanId;
  remaining: number;
};

/** Generates a quiz from the ticked chapters. The server decides what is allowed; this only displays it. */
export function QuizGenerator({ courseId, chapters, plan, remaining }: QuizGeneratorProps) {
  const router = useRouter();
  // Tracks what is unticked, so a chapter uploaded later starts ticked.
  const [unticked, setUnticked] = useState<ReadonlySet<number>>(new Set());
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTION_COUNT);
  const [error, setError] = useState<string>();
  const [generating, setGenerating] = useState(false);

  const chapterIds = chapters.filter((chapter) => !unticked.has(chapter.id)).map(({ id }) => id);
  const allowedCounts: readonly number[] = PLANS[plan].questionCounts;
  const hasLockedCounts = QUESTION_COUNTS.some((count) => !allowedCounts.includes(count));

  function toggle(id: number) {
    setUnticked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setGenerating(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds, questionCount }),
      });
      const result = await readGenerationResponse(response);
      if ("href" in result) {
        // Drops the cached course page (quiz list, quota) before leaving; a route handler can't.
        router.refresh();
        // Stay in the generating state until the quiz page replaces this one.
        router.push(result.href);
        return;
      }
      setError(result.error);
    } catch {
      setError(NETWORK_ERROR);
    }
    setGenerating(false);
  }

  if (remaining === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        You&apos;ve used all {PLANS[plan].monthlyQuizzes} quizzes of the {PLANS[plan].label} plan
        this month.{" "}
        {plan === "free" ? (
          <Link href="/billing" className="font-medium text-primary hover:underline">
            Upgrade to Pro
          </Link>
        ) : null}
      </p>
    );
  }

  return (
    <form onSubmit={generate} className="flex flex-col gap-4">
      <fieldset disabled={generating} className="flex min-w-0 flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Chapters to use</legend>
        {chapters.map((chapter) => (
          <label key={chapter.id} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={!unticked.has(chapter.id)}
              onChange={() => toggle(chapter.id)}
              className="size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0 truncate">{chapter.name}</span>
          </label>
        ))}
        <div className="flex gap-3 text-sm">
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setUnticked(new Set())}
          >
            Select all
          </button>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setUnticked(new Set(chapters.map(({ id }) => id)))}
          >
            Select none
          </button>
        </div>
      </fieldset>

      <fieldset disabled={generating} className="flex min-w-0 flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Number of questions</legend>
        {/* Equal columns on phones, so all counts stay in one row next to the lock icons. */}
        <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap">
          {QUESTION_COUNTS.map((count) => {
            const locked = !allowedCounts.includes(count);
            return (
              <label
                key={count}
                className={cn(
                  "flex h-10 items-center justify-center gap-1 rounded-md border px-2 text-sm sm:min-w-14 sm:gap-1.5 sm:px-3 font-medium transition-colors has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary has-focus-visible:ring-2 has-focus-visible:ring-ring",
                  locked
                    ? "cursor-not-allowed text-muted-foreground opacity-60"
                    : "cursor-pointer hover:bg-accent/50",
                )}
              >
                <input
                  type="radio"
                  name="questionCount"
                  value={count}
                  checked={questionCount === count}
                  disabled={locked}
                  onChange={() => setQuestionCount(count)}
                  className="sr-only"
                />
                {count}
                {locked ? <Lock className="size-3.5" aria-label="Pro only" /> : null}
              </label>
            );
          })}
        </div>
        {hasLockedCounts ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/billing" className="font-medium text-primary hover:underline">
              Upgrade to Pro
            </Link>{" "}
            for more questions per quiz.
          </p>
        ) : null}
      </fieldset>

      <FormError>{error}</FormError>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {generating ? "Generating your quiz. This usually takes 10 to 40 seconds." : null}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={generating || chapterIds.length === 0}>
          {generating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Generating…
            </>
          ) : (
            "Generate quiz"
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          {remaining} of {PLANS[plan].monthlyQuizzes} quizzes left this month
        </span>
      </div>
    </form>
  );
}
