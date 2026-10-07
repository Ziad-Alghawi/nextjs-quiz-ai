import "server-only";
import { and, avg, count, eq, gte, sql } from "drizzle-orm";
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

/** The user's submissions per day over the last year, dated "YYYY/MM/DD" as the heatmap expects. */
export async function getSubmissionActivity(userId: string) {
  const day = sql<string>`to_char(${quizSubmissions.createdAt}, 'YYYY/MM/DD')`;

  return db
    .select({ date: day, count: sql<number>`cast(count(*) as int)` })
    .from(quizSubmissions)
    .where(
      and(
        eq(quizSubmissions.userId, userId),
        gte(quizSubmissions.createdAt, sql`now() - interval '1 year'`),
      ),
    )
    .groupBy(day);
}
