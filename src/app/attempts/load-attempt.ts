import { notFound } from "next/navigation";
import { cache } from "react";
import { attemptIdSchema } from "@/lib/validations/quiz";
import { getAttempt } from "@/server/services/attempts";
import { getQuizWithQuestions } from "@/server/services/quizzes";
import { requireUser } from "@/server/session";

/**
 * The signed-in user's attempt with its quiz, or a 404. cache() runs the lookups once per request,
 * for the page and its title.
 */
export const loadAttempt = cache(async (attemptId: string, returnTo: string) => {
  const user = await requireUser(returnTo);

  const id = attemptIdSchema.safeParse(attemptId);
  if (!id.success) notFound();

  // Someone else's attempt is a 404 as well, so attempt ids can't be probed.
  const attempt = await getAttempt(user.id, id.data);
  if (!attempt) notFound();
  const quiz = await getQuizWithQuestions(user.id, attempt.quizId);
  if (!quiz) notFound();
  // Attempts saved before the chosen answers were stored have none. Exams came later, so an exam
  // attempt without answers is one where nothing was answered.
  const detailed = attempt.answers.length > 0 || quiz.kind === "exam";
  return { attempt, quiz, detailed, isGuest: user.isGuest };
});
