import { useEffect } from "react";

type PlayerKeys = {
  /** Off while nothing may be answered, e.g. during saving. */
  enabled: boolean;
  answers: { id: number }[];
  /** 1-4 (up to the number of options) picks that option. */
  onAnswer: (answerId: number) => void;
  /** Every other key, e.g. the arrow keys of the exam player. */
  onOtherKey?: (key: string) => void;
};

/** The players' keyboard shortcuts, on the whole window so they work wherever the focus is. */
export function usePlayerKeys({ enabled, answers, onAnswer, onOtherKey }: PlayerKeys) {
  // No dependency list: the handler is replaced on every render, so it never sees stale state.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!enabled || event.altKey || event.ctrlKey || event.metaKey) return;
      const number = Number(event.key);
      const answer = Number.isInteger(number) && number >= 1 ? answers[number - 1] : undefined;
      if (answer) onAnswer(answer.id);
      else onOtherKey?.(event.key);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}
