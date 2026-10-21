"use client";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** The accessible name; the content can show its own visible heading. */
  label: string;
  children: ReactNode;
  className?: string;
};

/**
 * A modal on the browser's native <dialog>: it traps focus, closes with Escape and makes the rest of
 * the page inert, so no library is needed. Clicking the backdrop closes it too.
 */
export function Dialog({ open, onClose, label, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      // The padding sits on the inner div, so a click on the dialog element itself is a backdrop click.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border bg-popover text-popover-foreground shadow-lg backdrop:bg-black/50",
        className,
      )}
    >
      {children}
    </dialog>
  );
}
