import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attemptAnswers, quizAttempts, quizzes } from "@/db/schema";
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

/**
 * The user's attempt with its chosen answers in question order. Attempts saved before answers were
 * stored have none.
 */
export function getAttempt(userId: string, attemptId: number) {
  return db.query.quizAttempts.findFirst({
    columns: { id: true, quizId: true, score: true, totalQuestions: true, createdAt: true },
    where: and(eq(quizAttempts.id, attemptId), eq(quizAttempts.userId, userId)),
    with: {
      answers: {
        columns: { questionId: true, answerId: true },
        orderBy: asc(attemptAnswers.questionId),
      },
    },
  });
}

/**
 * The user's attempts at the course's quizzes by quiz id, newest first, each quiz with its best
 * attempt (the highest percentage; the newest one on a tie). One query for the whole course page.
 */
export async function listCourseAttempts(userId: string, courseId: number) {
  const attempts = await db
    .select({
      id: quizAttempts.id,
      quizId: quizAttempts.quizId,
      score: quizAttempts.score,
      totalQuestions: quizAttempts.totalQuestions,
      createdAt: quizAttempts.createdAt,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .where(and(eq(quizAttempts.userId, userId), eq(quizzes.courseId, courseId)))
    .orderBy(desc(quizAttempts.createdAt), desc(quizAttempts.id));

  type Attempt = (typeof attempts)[number];
  const byQuiz = new Map<number, { attempts: Attempt[]; best: Attempt }>();
  for (const attempt of attempts) {
    const entry = byQuiz.get(attempt.quizId);
    if (!entry) {
      byQuiz.set(attempt.quizId, { attempts: [attempt], best: attempt });
      continue;
    }
    entry.attempts.push(attempt);
    // Percentages compared without dividing.
    if (attempt.score * entry.best.totalQuestions > entry.best.score * attempt.totalQuestions) {
      entry.best = attempt;
    }
  }
  return byQuiz;
}

/** Deletes the user's attempt with its answers and returns its quiz's course id, or null. */
export async function deleteAttempt(userId: string, attemptId: number) {
  const [deleted] = await db
    .delete(quizAttempts)
    .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.userId, userId)))
    .returning({ quizId: quizAttempts.quizId });
  if (!deleted) return null;

  const [quiz] = await db
    .select({ courseId: quizzes.courseId })
    .from(quizzes)
    .where(eq(quizzes.id, deleted.quizId));
  return quiz.courseId;
}
