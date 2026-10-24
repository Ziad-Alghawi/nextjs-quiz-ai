"use client";
import { Trash2 } from "lucide-react";
import { deleteAttempt } from "@/app/actions/attempts";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { DialogButton } from "@/components/dialog-button";

type Attempt = { id: number; label: string };

export function DeleteAttemptButton({ attempt }: { attempt: Attempt }) {
  return (
    <DialogButton
      variant="ghost"
      size="icon"
      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
      aria-label={`Delete the attempt of ${attempt.label}`}
      dialogLabel="Delete attempt"
      dialog={(close) => (
        <ConfirmDeleteForm
          title={`Delete the attempt of ${attempt.label}?`}
          field={{ name: "attemptId", value: attempt.id }}
          submitLabel="Delete attempt"
          action={deleteAttempt}
          onClose={close}
        >
          The attempt and its answers are removed, and it no longer counts in your stats.
        </ConfirmDeleteForm>
      )}
    >
      <Trash2 className="size-4" aria-hidden />
    </DialogButton>
  );
}
