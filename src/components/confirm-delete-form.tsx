"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
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
  const [state, formAction, pending] = useDialogForm(action, onClose);

  return (
    <form action={formAction} className="flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold wrap-break-word">{title}</h2>
      <input type="hidden" name={field.name} value={field.value} />
      <p className="text-sm">{children}</p>
      <FormError>{state.status === "error" ? state.error : undefined}</FormError>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
