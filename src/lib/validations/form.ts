import type { z } from "zod";

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** The first message per field, for showing next to form inputs. */
export function fieldErrors<T>(error: z.ZodError<T>): FieldErrors<T> {
  const errors: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof T;
    errors[field] ??= issue.message;
  }
  return errors;
}
