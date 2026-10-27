"use server";

import type { FormState } from "@/lib/form-state";
import { quizIdSchema } from "@/lib/validations/quiz";
import * as shares from "@/server/services/shares";
import { requireUser } from "@/server/session";

const NOT_SHAREABLE = "This quiz doesn't exist anymore or can't be shared. Reload the page.";
const NOT_FOUND = "This quiz doesn't exist anymore. Reload the page.";

type ShareQuizResult = { status: "shared"; token: string } | { status: "error"; error: string };

/** Shares one of the user's quizzes; the token makes its link. */
export async function shareQuiz(quizId: number): Promise<ShareQuizResult> {
  const user = await requireUser("/dashboard");

  // Server Actions are public endpoints, so the argument is untrusted input.
  const parsed = quizIdSchema.safeParse(quizId);
  if (!parsed.success) return { status: "error", error: NOT_SHAREABLE };

  const token = await shares.shareQuiz(user.id, parsed.data);
  return token ? { status: "shared", token } : { status: "error", error: NOT_SHAREABLE };
}

/** Turns the quiz's link off; people who have it can no longer open the quiz. */
export async function stopSharingQuiz(quizId: number): Promise<FormState> {
  const user = await requireUser("/dashboard");

  const parsed = quizIdSchema.safeParse(quizId);
  if (!parsed.success) return { status: "error", error: NOT_FOUND };

  return (await shares.stopSharingQuiz(user.id, parsed.data))
    ? { status: "saved" }
    : { status: "error", error: NOT_FOUND };
}
