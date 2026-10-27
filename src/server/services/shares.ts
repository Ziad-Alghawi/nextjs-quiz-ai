import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { questionAnswers, questions, quizzes } from "@/db/schema";
import { SHARED_COPY_BURST_LIMIT } from "@/lib/plans";
import { createQuiz, getQuizWithQuestions } from "./quizzes";
import { consumeRateLimit } from "./rate-limit";

// Exams aren't shared: they are the user's own snapshot of a course, scored without feedback.
const SHAREABLE_KINDS = ["generated", "review"] as const;

/**
 * Shares one of the user's quizzes and returns its link token, or undefined if the quiz isn't theirs
 * or can't be shared. Sharing again keeps the token, so links sent earlier keep working.
 */
export async function shareQuiz(userId: string, quizId: number) {
  // 24 random bytes: 32 URL-safe characters that can't be guessed.
  const token = randomBytes(24).toString("base64url");
  const [quiz] = await db
    .update(quizzes)
    .set({ shareToken: sql`coalesce(${quizzes.shareToken}, ${token})` })
    .where(
      and(
        eq(quizzes.id, quizId),
        eq(quizzes.userId, userId),
        inArray(quizzes.kind, SHAREABLE_KINDS),
      ),
    )
    .returning({ shareToken: quizzes.shareToken });
  return quiz?.shareToken ?? undefined;
}

/** Turns the link off; sharing the quiz again makes a new one. False if the quiz isn't the user's. */
export async function stopSharingQuiz(userId: string, quizId: number) {
  const stopped = await db
    .update(quizzes)
    .set({ shareToken: null })
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .returning({ id: quizzes.id });
  return stopped.length > 0;
}

/** The shared quiz with its questions and answers and who shared it, for anyone with the link. */
export async function getSharedQuiz(token: string) {
  const [quiz] = await db
    .select({ id: quizzes.id, userId: quizzes.userId })
    .from(quizzes)
    .where(eq(quizzes.shareToken, token));
  if (!quiz) return undefined;
  const shared = await getQuizWithQuestions(quiz.userId, quiz.id);
  return shared && { ...shared, ownerId: quiz.userId };
}

type SaveCopyResult = { quizId: number } | { error: "not-found" | "own-quiz" | "rate-limit" };

/**
 * Copies a shared quiz with its questions, answers and explanations into the user's "My quizzes"
 * folder, as their own quiz. No AI, so it doesn't count toward the monthly quota.
 */
export async function saveSharedQuiz(userId: string, token: string): Promise<SaveCopyResult> {
  if (!(await consumeRateLimit(`shared-copy:${userId}`, SHARED_COPY_BURST_LIMIT))) {
    return { error: "rate-limit" };
  }

  const quiz = await db.query.quizzes.findFirst({
    columns: { name: true, description: true, userId: true },
    where: eq(quizzes.shareToken, token),
    with: {
      questions: {
        columns: { questionText: true, explanation: true },
        orderBy: asc(questions.id),
        with: {
          answers: {
            columns: { answerText: true, isCorrect: true },
            orderBy: asc(questionAnswers.id),
          },
        },
      },
    },
  });
  if (!quiz) return { error: "not-found" };
  if (quiz.userId === userId) return { error: "own-quiz" };

  const { name, description, questions: copied } = quiz;
  return { quizId: await createQuiz(userId, { name, description, questions: copied }) };
}
