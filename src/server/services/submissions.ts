import "server-only";
import { db } from "@/db";
import { quizSubmissions } from "@/db/schema";

export async function createSubmission(submission: {
  quizId: number;
  userId: string;
  score: number;
  totalQuestions: number;
}) {
  const [{ id }] = await db
    .insert(quizSubmissions)
    .values(submission)
    .returning({ id: quizSubmissions.id });
  return id;
}
