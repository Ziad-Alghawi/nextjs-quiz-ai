import "server-only";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, quizSubmissions, quizzes } from "@/db/schema";

export async function getUserMetrics(userId: string) {
  const [[quizCount], [questionCount], [submissionStats]] = await Promise.all([
    db.select({ value: count() }).from(quizzes).where(eq(quizzes.userId, userId)),
    db
      .select({ value: count() })
      .from(questions)
      .innerJoin(quizzes, eq(questions.quizId, quizzes.id))
      .where(eq(quizzes.userId, userId)),
    db
      .select({
        count: count(),
        // Average of each attempt's percentage, so a 3/4 and a 3/10 aren't both counted as "3".
        averagePercent: sql<
          number | null
        >`cast(round(avg(${quizSubmissions.score} * 100.0 / nullif(${quizSubmissions.totalQuestions}, 0))) as int)`,
      })
      .from(quizSubmissions)
      .where(eq(quizSubmissions.userId, userId)),
  ]);

  return [
    { label: "Quizzes", value: quizCount.value },
    { label: "Questions", value: questionCount.value },
    { label: "Submissions", value: submissionStats.count },
    { label: "Average Score", value: submissionStats.averagePercent, unit: "%" },
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
