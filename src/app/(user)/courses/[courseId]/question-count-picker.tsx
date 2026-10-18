import { Lock } from "lucide-react";
import Link from "next/link";
import { PLANS, QUESTION_COUNTS, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

type QuestionCountPickerProps = {
  plan: PlanId;
  value: number;
  onChange: (count: number) => void;
  disabled?: boolean;
  /** Counts above it can't be picked, e.g. more than the chosen quizzes have. */
  max?: number;
};

/**
 * Every question count as a radio button named "questionCount". Counts of a higher plan are shown
 * locked with an upgrade link; the server checks the plan again.
 */
export function QuestionCountPicker({
  plan,
  value,
  onChange,
  disabled,
  max = Infinity,
}: QuestionCountPickerProps) {
  const allowedCounts: readonly number[] = PLANS[plan].questionCounts;
  const hasLockedCounts = QUESTION_COUNTS.some((count) => !allowedCounts.includes(count));

  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Number of questions</legend>
      {/* Equal columns on phones, so all counts stay in one row next to the lock icons. */}
      <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap">
        {QUESTION_COUNTS.map((count) => {
          const locked = !allowedCounts.includes(count);
          const unavailable = locked || count > max;
          return (
            <label
              key={count}
              className={cn(
                "flex h-10 items-center justify-center gap-1 rounded-md border px-2 text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary has-focus-visible:ring-2 has-focus-visible:ring-ring sm:min-w-14 sm:gap-1.5 sm:px-3",
                unavailable
                  ? "cursor-not-allowed text-muted-foreground opacity-60"
                  : "cursor-pointer hover:bg-accent/50",
              )}
            >
              <input
                type="radio"
                name="questionCount"
                value={count}
                checked={value === count}
                disabled={unavailable}
                onChange={() => onChange(count)}
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
  );
}
