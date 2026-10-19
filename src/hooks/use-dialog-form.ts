"use client";
import { useActionState } from "react";
import type { FormState } from "@/lib/form-state";

type FormAction = (previous: FormState, formData: FormData) => Promise<FormState>;

/** Form state for a form inside a dialog: runs the Server Action and closes the dialog once saved. */
export function useDialogForm(action: FormAction, onDone: () => void) {
  return useActionState<FormState, FormData>(
    async (previous, formData) => {
      const next = await action(previous, formData);
      if (next.status === "saved") onDone();
      return next;
    },
    { status: "idle" },
  );
}
