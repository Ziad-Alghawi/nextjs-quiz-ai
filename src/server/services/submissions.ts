import "server-only";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";

export async function createSubmission(submission: {
  quizId: number;
  userId: string;
  score: number;
  totalQuestions: number;
}) {
  const [{ id }] = await db
    .insert(quizAttempts)
    .values(submission)
    .returning({ id: quizAttempts.id });
  return id;
}
