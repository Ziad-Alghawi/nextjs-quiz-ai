"use client";
import { useState, type FormEvent } from "react";
import type { z } from "zod";
import { fieldErrors, type FieldErrors } from "@/lib/validations/form";

/** What a submit handler reports back to the form; nothing means it succeeded. */
type SubmitOutcome<Values> = { error: string } | { fieldErrors: FieldErrors<Values> } | void;

/**
 * State for a client form validated with a Zod schema: parses the form data, shows the first error
 * per field, and calls onValid with the parsed data while `pending` is true. onValid can return a
 * form-level error or field errors from the server.
 */
export function useZodForm<Schema extends z.ZodTypeAny>(
  schema: Schema,
  onValid: (
    data: z.output<Schema>,
    form: HTMLFormElement,
  ) => Promise<SubmitOutcome<z.input<Schema>>>,
  initialError: string | null = null,
) {
  const [errors, setErrors] = useState<FieldErrors<z.input<Schema>>>({});
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setPending(true);
    const outcome = await onValid(parsed.data, form).finally(() => setPending(false));
    if (outcome && "error" in outcome) setError(outcome.error);
    if (outcome && "fieldErrors" in outcome) setErrors(outcome.fieldErrors);
  };

  const reset = () => {
    setErrors({});
    setError(null);
  };

  return { errors, error, setError, pending, onSubmit, reset };
}
