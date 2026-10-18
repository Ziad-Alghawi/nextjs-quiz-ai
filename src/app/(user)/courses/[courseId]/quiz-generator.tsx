"use client";
import Link from "next/link";
import { useState } from "react";
import { GenerateQuizActions } from "@/components/generate-quiz-actions";
import { FormError } from "@/components/ui/form-error";
import { useQuizGeneration } from "@/hooks/use-quiz-generation";
import { DEFAULT_QUESTION_COUNT, PLANS, type PlanId } from "@/lib/plans";
import { QuestionCountPicker } from "@/components/question-count-picker";

type QuizGeneratorProps = {
  courseId: number;
  chapters: { id: number; name: string }[];
  plan: PlanId;
  remaining: number;
};

/** Generates a quiz from the ticked chapters. The server decides what is allowed; this only displays it. */
export function QuizGenerator({ courseId, chapters, plan, remaining }: QuizGeneratorProps) {
  // Tracks what is unticked, so a chapter uploaded later starts ticked.
  const [unticked, setUnticked] = useState<ReadonlySet<number>>(new Set());
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTION_COUNT);
  const { error, generating, generate } = useQuizGeneration();

  const chapterIds = chapters.filter((chapter) => !unticked.has(chapter.id)).map(({ id }) => id);

  function toggle(id: number) {
    setUnticked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void generate(() =>
      fetch(`/api/courses/${courseId}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds, questionCount }),
      }),
    );
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
    <form onSubmit={submit} className="flex flex-col gap-4">
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
        {chapterIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tick at least one chapter.</p>
        ) : null}
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

      <QuestionCountPicker
        plan={plan}
        value={questionCount}
        onChange={setQuestionCount}
        disabled={generating}
      />

      <FormError>{error}</FormError>
      <GenerateQuizActions
        generating={generating}
        disabled={chapterIds.length === 0}
        plan={plan}
        remaining={remaining}
      />
    </form>
  );
}
