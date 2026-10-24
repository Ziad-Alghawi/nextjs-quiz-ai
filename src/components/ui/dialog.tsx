"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** The accessible name; the content can show its own visible heading. */
  label: string;
  /** While true, e.g. while saving, Escape and backdrop clicks leave the dialog open. */
  busy?: boolean;
  children: ReactNode;
  className?: string;
};

const SetDialogBusy = createContext<(busy: boolean) => void>(() => {});

/** Lets content inside a Dialog, such as a form that is saving, mark the dialog busy. */
export function useDialogBusy(busy: boolean) {
  const setBusy = useContext(SetDialogBusy);
  useEffect(() => {
    setBusy(busy);
    // Content that unmounts while saving, e.g. once the dialog closes on success, must not leave
    // the next opening locked.
    return () => setBusy(false);
  }, [busy, setBusy]);
}

/**
 * A modal on the browser's native <dialog>: it traps focus, closes with Escape and makes the rest of
 * the page inert, so no library is needed. Clicking the backdrop closes it too.
 */
export function Dialog({ open, onClose, label, busy = false, children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [contentBusy, setContentBusy] = useState(false);
  const locked = busy || contentBusy;

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
      // closedby stops Escape where it is supported; preventing the cancel event covers the rest.
      closedby={locked ? "none" : undefined}
      onCancel={(event) => {
        if (locked) event.preventDefault();
      }}
      onClose={onClose}
      // The padding sits on the inner div, so a click on the dialog element itself is a backdrop click.
      onClick={(event) => {
        if (event.target === event.currentTarget && !locked) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border bg-popover text-popover-foreground shadow-lg backdrop:bg-black/50",
        className,
      )}
    >
      <SetDialogBusy value={setContentBusy}>{children}</SetDialogBusy>
    </dialog>
  );
}
