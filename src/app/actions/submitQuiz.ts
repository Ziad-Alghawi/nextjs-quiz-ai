"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { scoreAttempt } from "@/lib/scoring";
import { quizIdSchema } from "@/lib/validations/quiz";
import { getQuizWithQuestions } from "@/server/services/quizzes";
import { createSubmission } from "@/server/services/submissions";
import { getCurrentUser } from "@/server/session";

const submitQuizSchema = z.object({
  quizId: quizIdSchema,
  answers: z.array(z.object({ questionId: z.number().int(), answerId: z.number().int() })).max(100),
});

type SubmitQuizResult =
  { status: "saved"; score: number; total: number } | { status: "error"; error: string };

/** Scores the chosen answers on the server and stores the result. */
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

  const quiz = await getQuizWithQuestions(quizId, user.id);
  if (!quiz) return { status: "error", error: "This quiz doesn't exist anymore." };

  const { score, total, complete } = scoreAttempt(quiz.questions, answers);
  if (!complete) return { status: "error", error: "Answer every question before submitting." };

  await createSubmission({ quizId, userId: user.id, score, totalQuestions: total });
  // Also clears the browser's cached dashboard, which the result screen's Back button returns to.
  revalidatePath("/dashboard");
  return { status: "saved", score, total };
}
