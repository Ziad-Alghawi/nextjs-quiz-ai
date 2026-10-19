import "server-only";
import { db } from "@/db";
import { attemptAnswers, quizAttempts } from "@/db/schema";
import { scoreAttempt, type SelectedAnswer } from "@/lib/scoring";
import { getQuizWithQuestions } from "./quizzes";

type SaveAttemptResult =
  { attemptId: number; score: number; total: number } | { error: "not-found" | "incomplete" };

/** Scores the chosen answers against the user's quiz and stores the attempt together with them. */
export async function saveAttempt(
  userId: string,
  quizId: number,
  selected: SelectedAnswer[],
): Promise<SaveAttemptResult> {
  const quiz = await getQuizWithQuestions(quizId, userId);
  if (!quiz) return { error: "not-found" };

  const { score, total, complete, answers } = scoreAttempt(quiz.questions, selected);
  if (!complete) return { error: "incomplete" };

  const attemptId = await db.transaction(async (tx) => {
    const [{ id }] = await tx
      .insert(quizAttempts)
      .values({ quizId, userId, score, totalQuestions: total })
      .returning({ id: quizAttempts.id });
    await tx.insert(attemptAnswers).values(answers.map((answer) => ({ ...answer, attemptId: id })));
    return id;
  });
  return { attemptId, score, total };
}
