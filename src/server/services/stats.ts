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

/** The user's submissions per day (UTC dates, YYYY-MM-DD) over the last year. */
export async function getSubmissionActivity(userId: string) {
  const day = sql<string>`to_char(${quizSubmissions.createdAt}, 'YYYY-MM-DD')`;

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

const DAY_MS = 24 * 60 * 60 * 1000;
const dayNumber = (date: string) => Date.parse(date) / DAY_MS;

/** Streaks in consecutive UTC days with a submission, and the submissions in the current month. */
export function summarizeActivity(activity: { date: string; count: number }[], today: string) {
  const active = new Set(activity.filter((day) => day.count > 0).map((day) => dayNumber(day.date)));

  let longestStreak = 0;
  let run = 0;
  for (const day of [...active].sort((a, b) => a - b)) {
    run = active.has(day - 1) ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  // A day without a quiz yet doesn't end the streak until the day is over.
  let currentStreak = 0;
  const todayNumber = dayNumber(today);
  for (let day = active.has(todayNumber) ? todayNumber : todayNumber - 1; active.has(day); day--) {
    currentStreak++;
  }

  const month = today.slice(0, 7);
  const quizzesThisMonth = activity
    .filter((day) => day.date.startsWith(month))
    .reduce((total, day) => total + day.count, 0);

  return { currentStreak, longestStreak, quizzesThisMonth };
}
