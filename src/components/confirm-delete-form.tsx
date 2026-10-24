"use client";
import type { ReactNode } from "react";
import { DialogFormActions } from "@/components/dialog-form-actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { useDialogForm } from "@/hooks/use-dialog-form";
import type { FormState } from "@/lib/form-state";

type ConfirmDeleteFormProps = {
  title: string;
  /** The hidden field that tells the action what to delete, e.g. `{ name: "courseId", value: 7 }`. */
  field: { name: string; value: number };
  submitLabel: string;
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  onClose: () => void;
  /** What deleting removes. */
  children: ReactNode;
};

/** The content of a delete dialog: what goes, an error if deleting fails, Cancel and Delete. */
export function ConfirmDeleteForm({
  title,
  field,
  submitLabel,
  action,
  onClose,
  children,
}: ConfirmDeleteFormProps) {
  const [state, formAction] = useDialogForm(action, onClose);

  return (
    <form action={formAction} className="flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold wrap-break-word">{title}</h2>
      <input type="hidden" name={field.name} value={field.value} />
      <p className="text-sm">{children}</p>
      <DialogFormActions
        error={state.status === "error" ? state.error : undefined}
        onCancel={onClose}
      >
        <SubmitButton variant="destructive" pendingText="Deleting…">
          {submitLabel}
        </SubmitButton>
      </DialogFormActions>
    </form>
  );
}
