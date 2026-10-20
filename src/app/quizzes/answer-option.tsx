import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const LETTERS = "ABCDEF";

/** "open" before answering; after it, the right option, the wrong pick and the rest. */
type AnswerState = "open" | "correct" | "wrong" | "other";

type AnswerOptionProps = {
  index: number;
  text: string;
  state: AnswerState;
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
};

/** One option of a question: its letter (or ✓/✕ once answered) and its text. */
export function AnswerOption({
  index,
  text,
  state,
  pressed,
  disabled,
  onClick,
}: AnswerOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
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
          LETTERS[index]
        )}
      </span>
      <span className="min-w-0 flex-1 pt-0.5 wrap-break-word">{text}</span>
    </button>
  );
}
