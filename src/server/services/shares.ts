import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { getQuizWithQuestions } from "./quizzes";

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

/** The shared quiz with its questions and answers, for anyone with the link. */
export async function getSharedQuiz(token: string) {
  const [quiz] = await db
    .select({ id: quizzes.id, userId: quizzes.userId })
    .from(quizzes)
    .where(eq(quizzes.shareToken, token));
  return quiz ? getQuizWithQuestions(quiz.userId, quiz.id) : undefined;
}
