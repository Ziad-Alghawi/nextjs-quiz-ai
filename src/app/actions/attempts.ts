"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/form-state";
import { MAX_ATTEMPT_QUESTIONS } from "@/lib/plans";
import { attemptIdSchema, quizIdSchema } from "@/lib/validations/quiz";
import * as attempts from "@/server/services/attempts";
import { getCurrentUser, requireUser } from "@/server/session";

const ATTEMPT_NOT_FOUND = "This attempt doesn't exist anymore. Reload the page.";

const submitQuizSchema = z.object({
  quizId: quizIdSchema,
  answers: z
    .array(z.object({ questionId: z.number().int(), answerId: z.number().int() }))
    .max(MAX_ATTEMPT_QUESTIONS),
});

type SubmitQuizResult =
  | { status: "saved"; attemptId: number; score: number; total: number }
  | { status: "error"; error: string };

/** Scores the chosen answers on the server and stores the attempt with them. */
export async function submitQuiz(
  input: z.input<typeof submitQuizSchema>,
): Promise<SubmitQuizResult> {
  // Not requireUser(): redirecting to sign-in here would throw away the answers on the screen.
  const user = await getCurrentUser();
  if (!user) {
    return { status: "error", error: "Your session has expired. Sign in again to save results." };
  }

  // Server Actions are public endpoints, so the arguments are untrusted input.
  const parsed = submitQuizSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "Your answers couldn't be read." };
  const { quizId, answers } = parsed.data;

  const result = await attempts.saveAttempt(user.id, quizId, answers);
  if ("error" in result) {
    return {
      status: "error",
      error:
        result.error === "not-found"
          ? "This quiz doesn't exist anymore."
          : "Answer every question before submitting.",
    };
  }
  // Also clears the browser's cached dashboard, which the result screen's Back button returns to.
  revalidatePath("/dashboard");
  return { status: "saved", ...result };
}

/** Deletes one of the user's attempts; the course page and the dashboard stats lose it. */
export async function deleteAttempt(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard");

  const parsed = z.object({ attemptId: attemptIdSchema }).safeParse({
    attemptId: formData.get("attemptId"),
  });
  if (!parsed.success) return { status: "error", error: ATTEMPT_NOT_FOUND };

  const courseId = await attempts.deleteAttempt(user.id, parsed.data.attemptId);
  if (courseId === null) return { status: "error", error: ATTEMPT_NOT_FOUND };
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/dashboard");
  return { status: "saved" };
}
