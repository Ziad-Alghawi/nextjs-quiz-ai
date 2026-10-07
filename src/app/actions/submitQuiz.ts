"use server";

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

/** Scores the chosen answers on the server and stores the result. */
export async function submitQuiz(input: z.input<typeof submitQuizSchema>) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to save your result.");

  // Server Actions are public endpoints, so the arguments are untrusted input.
  const { quizId, answers } = submitQuizSchema.parse(input);

  const quiz = await getQuizWithQuestions(quizId, user.id);
  if (!quiz) throw new Error("Quiz not found.");

  const { score, total, complete } = scoreAttempt(quiz.questions, answers);
  if (!complete) throw new Error("Answer every question before submitting.");

  await createSubmission({ quizId, userId: user.id, score, totalQuestions: total });
  return { score, total };
}
