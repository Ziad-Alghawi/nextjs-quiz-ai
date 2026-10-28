import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type GenerateQuizActionsProps = {
  generating: boolean;
  /** Nothing to generate from yet, e.g. no chapter or file chosen. */
  disabled: boolean;
  /** How many quizzes are left, e.g. of the month or of the trial. */
  remainingText: string;
};

/** The submit button of a quiz-generation form, with the progress hint and the quota left. */
export function GenerateQuizActions({
  generating,
  disabled,
  remainingText,
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
              <Spinner className="mr-2" />
              Generating…
            </>
          ) : (
            "Generate quiz"
          )}
        </Button>
        <span className="text-sm text-muted-foreground">{remainingText}</span>
      </div>
    </>
  );
}
