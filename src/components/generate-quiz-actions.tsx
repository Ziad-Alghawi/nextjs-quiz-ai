import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanId } from "@/lib/plans";

type GenerateQuizActionsProps = {
  generating: boolean;
  /** Nothing to generate from yet, e.g. no chapter or file chosen. */
  disabled: boolean;
  plan: PlanId;
  remaining: number;
};

/** The submit button of a quiz-generation form, with the progress hint and the quota left. */
export function GenerateQuizActions({
  generating,
  disabled,
  plan,
  remaining,
}: GenerateQuizActionsProps) {
  return (
    <>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {generating ? "Generating your quiz. This usually takes 10 to 40 seconds." : null}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={generating || disabled}>
          {generating ? (
            <>
              <Loader2 className="mr-2 size-4 motion-safe:animate-spin" aria-hidden />
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
    </>
  );
}
