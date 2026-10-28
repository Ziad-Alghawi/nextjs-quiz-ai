"use client";
import { useActionState } from "react";
import { saveSharedQuiz } from "@/app/actions/shares";
import { FormError } from "@/components/ui/form-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE, type FormState } from "@/lib/form-state";

/** Saves a copy of the shared quiz; the action opens the copy, so the form only sees an error. */
export function SaveCopyForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveSharedQuiz, IDLE);

  return (
    <form action={action} className="flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="token" value={token} />
      <SubmitButton pendingText="Saving…" className="h-9 px-3">
        Save a copy
      </SubmitButton>
      <FormError className="max-w-72 text-right">
        {state.status === "error" ? state.error : undefined}
      </FormError>
    </form>
  );
}
