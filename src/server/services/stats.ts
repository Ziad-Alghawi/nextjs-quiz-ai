import "server-only";
import { avg, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, quizSubmissions, quizzes, users } from "@/db/schema";

export async function getUserMetrics(userId: string) {
  const numQuizzes = await db
    .select({ value: count() })
    .from(quizzes)
    .where(eq(quizzes.userId, userId));

  const numQuestions = await db
    .select({ value: count() })
    .from(questions)
    .innerJoin(quizzes, eq(questions.quizId, quizzes.id))
    .innerJoin(users, eq(quizzes.userId, users.id))
    .where(eq(quizzes.userId, userId));

  const numSubmissions = await db
    .select({ value: count() })
    .from(quizSubmissions)
    .innerJoin(quizzes, eq(quizSubmissions.quizId, quizzes.id))
    .innerJoin(users, eq(quizzes.userId, users.id))
    .where(eq(quizzes.userId, userId));

  const avgScore = await db
    .select({ value: avg(quizSubmissions.score) })
    .from(quizSubmissions)
    .innerJoin(quizzes, eq(quizSubmissions.quizId, quizzes.id))
    .innerJoin(users, eq(quizzes.userId, users.id))
    .where(eq(quizzes.userId, userId));

  return [
    { label: "Quizzes", value: numQuizzes[0].value },
    { label: "Questions", value: numQuestions[0].value },
    { label: "Submissions", value: numSubmissions[0].value },
    { label: "Average Score", value: avgScore[0].value },
  ];
}

export async function getSubmissionActivity() {
  const data = await db
    .select({
      createdAt: quizSubmissions.createdAt,
      count: sql<number>`cast(count(${quizSubmissions.id}) as int)`,
    })
    .from(quizSubmissions)
    .innerJoin(quizzes, eq(quizSubmissions.quizId, quizzes.id))
    .innerJoin(users, eq(quizzes.userId, users.id))
    .groupBy(quizSubmissions.createdAt);

  return { data };
}
