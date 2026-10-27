"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { SHARED_COPY_BURST_LIMIT } from "@/lib/plans";
import { quizIdSchema, shareTokenSchema } from "@/lib/validations/quiz";
import * as shares from "@/server/services/shares";
import { requireAccount } from "@/server/session";

const NOT_SHAREABLE = "This quiz doesn't exist anymore or can't be shared. Reload the page.";
const NOT_FOUND = "This quiz doesn't exist anymore. Reload the page.";
const LINK_OFF = "This link was turned off, so the quiz can't be saved anymore.";

type ShareQuizResult = { status: "shared"; token: string } | { status: "error"; error: string };

/** Shares one of the user's quizzes; the token makes its link. */
export async function shareQuiz(quizId: number): Promise<ShareQuizResult> {
  const user = await requireAccount("/dashboard");

  // Server Actions are public endpoints, so the argument is untrusted input.
  const parsed = quizIdSchema.safeParse(quizId);
  if (!parsed.success) return { status: "error", error: NOT_SHAREABLE };

  const token = await shares.shareQuiz(user.id, parsed.data);
  return token ? { status: "shared", token } : { status: "error", error: NOT_SHAREABLE };
}

/** Turns the quiz's link off; people who have it can no longer open the quiz. */
export async function stopSharingQuiz(quizId: number): Promise<FormState> {
  const user = await requireAccount("/dashboard");

  const parsed = quizIdSchema.safeParse(quizId);
  if (!parsed.success) return { status: "error", error: NOT_FOUND };

  return (await shares.stopSharingQuiz(user.id, parsed.data))
    ? { status: "saved" }
    : { status: "error", error: NOT_FOUND };
}

type SaveCopyError = Extract<Awaited<ReturnType<typeof shares.saveSharedQuiz>>, { error: string }>;

function saveCopyError({ error }: SaveCopyError) {
  switch (error) {
    case "not-found":
      return LINK_OFF;
    case "own-quiz":
      return "This is your own quiz, so there is nothing to save.";
    case "rate-limit": {
      const { max, windowMinutes } = SHARED_COPY_BURST_LIMIT;
      return `You can save ${max} shared quizzes every ${windowMinutes} minutes. Please try again in a few minutes.`;
    }
  }
}

/** Copies a shared quiz into the user's "My quizzes" folder and opens the copy. */
export async function saveSharedQuiz(_previous: FormState, formData: FormData): Promise<FormState> {
  const token = shareTokenSchema.safeParse(formData.get("token"));
  if (!token.success) return { status: "error", error: LINK_OFF };
  // Signing in leads back to the shared quiz, where the button is.
  const user = await requireAccount(`/shared/${token.data}`);

  const result = await shares.saveSharedQuiz(user.id, token.data);
  if ("error" in result) return { status: "error", error: saveCopyError(result) };

  // The folder and the Overview list the copy.
  revalidatePath("/", "layout");
  redirect(`/quizzes/${result.quizId}`);
}
