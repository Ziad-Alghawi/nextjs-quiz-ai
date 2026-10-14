import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { courses, quizzes, users } from "@/db/schema";
import { getOrCreateDefaultCourse } from "./courses";
import { createQuiz } from "./quizzes";

const USER = "courses-db-test-user";

const generatedQuiz = {
  name: "Test quiz",
  description: "A quiz for the tests.",
  questions: [
    {
      questionText: "Which one is right?",
      answers: [
        { answerText: "This one", isCorrect: true },
        { answerText: "That one", isCorrect: false },
      ],
    },
  ],
};

beforeEach(async () => {
  await db.delete(users).where(eq(users.id, USER));
  await db.insert(users).values({ id: USER, name: "Courses test", email: `${USER}@example.com` });
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, USER));
});

describe("getOrCreateDefaultCourse", () => {
  it("creates one course, also for parallel requests", async () => {
    const ids = await Promise.all(
      Array.from({ length: 10 }, () => getOrCreateDefaultCourse(db, USER)),
    );

    const rows = await db.select().from(courses).where(eq(courses.userId, USER));
    expect(rows).toEqual([expect.objectContaining({ id: ids[0], name: "My quizzes" })]);
    expect(new Set(ids)).toEqual(new Set([ids[0]]));
  });
});

describe("createQuiz", () => {
  it("puts every quiz into the user's default course", async () => {
    const first = await createQuiz(generatedQuiz, USER);
    const second = await createQuiz(generatedQuiz, USER);

    const [course] = await db.select().from(courses).where(eq(courses.userId, USER));
    const saved = await db
      .select({ id: quizzes.id, courseId: quizzes.courseId })
      .from(quizzes)
      .where(eq(quizzes.userId, USER));
    expect(saved).toEqual(
      expect.arrayContaining([
        { id: first, courseId: course.id },
        { id: second, courseId: course.id },
      ]),
    );
    expect(saved).toHaveLength(2);
  });
});
