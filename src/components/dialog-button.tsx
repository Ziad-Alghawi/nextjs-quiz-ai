"use client";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type DialogButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "asChild"> & {
  /** The dialog's accessible name. */
  dialogLabel: string;
  /** The dialog's content; `close` closes it, e.g. from Cancel or once the form is saved. */
  dialog: (close: () => void) => ReactNode;
};

/** A button that opens a dialog, e.g. to confirm a delete; it takes every Button prop. */
export function DialogButton({ dialogLabel, dialog, ...button }: DialogButtonProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button {...button} onClick={() => setOpen(true)} />
      <Dialog open={open} onClose={close} label={dialogLabel}>
        {/* Mounted only while open, so each opening starts with fresh form state. */}
        {open ? dialog(close) : null}
      </Dialog>
    </>
  );
}
