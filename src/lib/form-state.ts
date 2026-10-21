/** What a form's Server Action returns to useActionState. */
export type FormState = { status: "idle" | "saved" } | { status: "error"; error: string };
