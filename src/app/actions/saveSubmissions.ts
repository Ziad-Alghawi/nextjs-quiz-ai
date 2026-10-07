"use server";

import { db } from "@/db";
import { quizSubmissions } from "@/db/schema";
import { InferInsertModel } from "drizzle-orm";

type Submission = InferInsertModel<typeof quizSubmissions>;

export async function saveSubmissions(sub: Submission, quizId: number) {
  const { score } = sub;

  const newSubmission = await db
    .insert(quizSubmissions)
    .values({
      quizId,
      score,
    })
    .returning({ insertedId: quizSubmissions.id });
  const submissionId = newSubmission[0].insertedId;
  return submissionId;
}
