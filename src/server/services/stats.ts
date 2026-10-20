import "server-only";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { questions, quizAttempts, quizzes } from "@/db/schema";
import { DAY_MS } from "@/lib/time";

// Reviews and exams are copies of generated questions, so counting them would inflate both totals.
const generatedBy = (userId: string) =>
  and(eq(quizzes.userId, userId), eq(quizzes.kind, "generated"));

export async function getUserMetrics(userId: string) {
  const [[quizCount], [questionCount], [attemptStats]] = await Promise.all([
    db.select({ value: count() }).from(quizzes).where(generatedBy(userId)),
    db
      .select({ value: count() })
      .from(questions)
      .innerJoin(quizzes, eq(questions.quizId, quizzes.id))
      .where(generatedBy(userId)),
    db
      .select({
        count: count(),
        // Average of each attempt's percentage, so a 3/4 and a 3/10 aren't both counted as "3".
        averagePercent: sql<
          number | null
        >`cast(round(avg(${quizAttempts.score} * 100.0 / nullif(${quizAttempts.totalQuestions}, 0))) as int)`,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId)),
  ]);

  return {
    quizzes: quizCount.value,
    questions: questionCount.value,
    attempts: attemptStats.count,
    averagePercent: attemptStats.averagePercent,
  };
}

/** The user's attempts per day (UTC dates, YYYY-MM-DD) over the last year. */
export async function getAttemptActivity(userId: string) {
  const day = sql<string>`to_char(${quizAttempts.createdAt}, 'YYYY-MM-DD')`;

  return db
    .select({ date: day, count: sql<number>`cast(count(*) as int)` })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.userId, userId),
        gte(quizAttempts.createdAt, sql`now() - interval '1 year'`),
      ),
    )
    .groupBy(day);
}

const dayNumber = (date: string) => Date.parse(date) / DAY_MS;

/** Streaks in consecutive UTC days with an attempt, and the attempts in the current month. */
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
