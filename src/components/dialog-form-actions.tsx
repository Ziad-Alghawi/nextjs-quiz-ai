"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { useDialogBusy } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";

type DialogFormActionsProps = {
  /** Why saving failed, shown above the buttons. */
  error?: string;
  onCancel: () => void;
  /** The submit button, usually a SubmitButton; left out when there is nothing to submit. */
  children?: ReactNode;
};

/** The end of a form inside a dialog: its error, Cancel and the submit button. */
export function DialogFormActions({ error, onCancel, children }: DialogFormActionsProps) {
  // useFormStatus only works in a component rendered inside the form.
  const { pending } = useFormStatus();
  // Closing mid-save would hide the result; a failed save unlocks the dialog again.
  useDialogBusy(pending);

  return (
    <>
      <FormError>{error}</FormError>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        {children}
      </div>
    </>
  );
}
