"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MAX_QUESTIONS } from "@/lib/plans";
import { quizIdSchema } from "@/lib/validations/quiz";
import { saveAttempt } from "@/server/services/attempts";
import { getCurrentUser } from "@/server/session";

const submitQuizSchema = z.object({
  quizId: quizIdSchema,
  answers: z
    .array(z.object({ questionId: z.number().int(), answerId: z.number().int() }))
    .max(MAX_QUESTIONS),
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

  const result = await saveAttempt(user.id, quizId, answers);
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
