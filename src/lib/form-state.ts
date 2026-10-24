/** What a form's Server Action returns to useActionState. */
export type FormState = { status: "idle" | "saved" } | { status: "error"; error: string };

/** The state a form starts with, before its first submit. */
export const IDLE: FormState = { status: "idle" };
