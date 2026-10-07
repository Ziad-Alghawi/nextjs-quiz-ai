"use server";

import { z } from "zod";
import { quizIdSchema } from "@/lib/validations/quiz";
import { getQuizWithQuestions } from "@/server/services/quizzes";
import { createSubmission } from "@/server/services/submissions";
import { getCurrentUser } from "@/server/session";

const scoreSchema = z.number().int().min(0);

export async function saveSubmissions(sub: { score: number }, quizId: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to save your result.");

  // Server Actions are public endpoints, so the arguments are untrusted input.
  const id = quizIdSchema.parse(quizId);
  const score = scoreSchema.parse(sub.score);

  const quiz = await getQuizWithQuestions(id, user.id);
  if (!quiz) throw new Error("Quiz not found.");

  return createSubmission({
    quizId: id,
    userId: user.id,
    score: Math.min(score, quiz.questions.length),
    totalQuestions: quiz.questions.length,
  });
}
