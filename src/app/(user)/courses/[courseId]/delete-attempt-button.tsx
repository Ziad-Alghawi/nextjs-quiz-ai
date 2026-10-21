"use client";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteAttempt } from "@/app/actions/attempts";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Attempt = { id: number; label: string };

export function DeleteAttemptButton({ attempt }: { attempt: Attempt }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Delete the attempt of ${attempt.label}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} label="Delete attempt">
        {/* Mounted only while open, so each opening starts with fresh form state. */}
        {open ? (
          <ConfirmDeleteForm
            title={`Delete the attempt of ${attempt.label}?`}
            field={{ name: "attemptId", value: attempt.id }}
            submitLabel="Delete attempt"
            action={deleteAttempt}
            onClose={() => setOpen(false)}
          >
            The attempt and its answers are removed, and it no longer counts in your stats.
          </ConfirmDeleteForm>
        ) : null}
      </Dialog>
    </>
  );
}
