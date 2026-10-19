"use client";
import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { createReview } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import type { FormState } from "@/lib/form-state";
import { DEFAULT_QUESTION_COUNT, MAX_REVIEW_QUIZZES, type PlanId } from "@/lib/plans";
import { QuestionCountPicker } from "@/components/question-count-picker";

type ReviewQuizFormProps = {
  courseId: number;
  quizzes: { id: number; name: string; questionCount: number }[];
  plan: PlanId;
};

/** Mixes questions of the ticked quizzes into a new quiz, without AI. */
export function ReviewQuizForm({ courseId, quizzes, plan }: ReviewQuizFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(createReview, {
    status: "idle",
  });
  const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set());
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTION_COUNT);

  const chosen = quizzes.filter((quiz) => ticked.has(quiz.id));
  const available = chosen.reduce((total, quiz) => total + quiz.questionCount, 0);
  const hint =
    chosen.length < 2
      ? "Tick at least two quizzes."
      : chosen.length > MAX_REVIEW_QUIZZES
        ? `Tick at most ${MAX_REVIEW_QUIZZES} quizzes.`
        : questionCount > available
          ? `These quizzes have only ${available} questions together. Choose fewer questions.`
          : null;

  function toggle(id: number) {
    setTicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Mixes questions from your quizzes. Instant, and it doesn&apos;t use your monthly quizzes.
      </p>
      <input type="hidden" name="courseId" value={courseId} />
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Quizzes to mix</legend>
        {quizzes.map((quiz) => (
          <label key={quiz.id} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="quizIds"
              value={quiz.id}
              checked={ticked.has(quiz.id)}
              onChange={() => toggle(quiz.id)}
              className="size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0 flex-1 truncate">{quiz.name}</span>
            <span className="shrink-0 text-muted-foreground">{quiz.questionCount} questions</span>
          </label>
        ))}
      </fieldset>

      {/* Until two quizzes are ticked, every count stays pickable. */}
      <QuestionCountPicker
        plan={plan}
        value={questionCount}
        onChange={setQuestionCount}
        disabled={pending}
        max={chosen.length >= 2 ? available : undefined}
      />

      <FormError>{state.status === "error" ? state.error : undefined}</FormError>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}

      <div>
        <Button type="submit" variant="outline" disabled={pending || hint !== null}>
          {pending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Creating…
            </>
          ) : (
            "Create review quiz"
          )}
        </Button>
      </div>
    </form>
  );
}
