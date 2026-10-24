import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizAttempts, quizzes } from "@/db/schema";
import { createUsers, deleteUsers } from "@/test/db-fixtures";
import { generatedQuiz } from "@/test/generated-quiz";
import { createQuiz } from "./quizzes";
import { getUserMetrics } from "./stats";

const USER = "stats-db-test-user";
const OTHER_USER = "stats-db-test-other";

beforeEach(() => createUsers(USER, OTHER_USER));
afterAll(() => deleteUsers(USER, OTHER_USER));

describe("getUserMetrics", () => {
  it("returns zeros and no average for a user without anything", async () => {
    expect(await getUserMetrics(USER)).toEqual({
      quizzes: 0,
      questions: 0,
      attempts: 0,
      averagePercent: null,
    });
  });

  it("counts generated quizzes only, but the attempts of every kind", async () => {
    const generated = await createQuiz(USER, generatedQuiz(4));
    const review = await createQuiz(USER, generatedQuiz(2));
    await db.update(quizzes).set({ kind: "review" }).where(eq(quizzes.id, review));
    const other = await createQuiz(OTHER_USER, generatedQuiz(3));

    await db.insert(quizAttempts).values([
      { quizId: generated, userId: USER, score: 3, totalQuestions: 4 },
      { quizId: review, userId: USER, score: 1, totalQuestions: 2 },
      { quizId: other, userId: OTHER_USER, score: 0, totalQuestions: 3 },
    ]);

    expect(await getUserMetrics(USER)).toEqual({
      quizzes: 1,
      questions: 4,
      attempts: 2,
      averagePercent: 63, // 75 % and 50 % average to 62.5
    });
  });
});
