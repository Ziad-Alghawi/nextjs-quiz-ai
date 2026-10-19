import "server-only";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";

export async function createAttempt(attempt: {
  quizId: number;
  userId: string;
  score: number;
  totalQuestions: number;
}) {
  const [{ id }] = await db.insert(quizAttempts).values(attempt).returning({ id: quizAttempts.id });
  return id;
}
