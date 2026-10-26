import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { courses, quizzes } from "@/db/schema";
import { addCourse, createUsers, deleteUsers } from "@/test/db-fixtures";
import { generatedQuiz } from "@/test/generated-quiz";
import { createQuiz, listReviewSources } from "./quizzes";

const USER = "quizzes-db-test-user";
const OTHER_USER = "quizzes-db-test-other";

beforeEach(() => createUsers(USER, OTHER_USER));
afterAll(() => deleteUsers(USER, OTHER_USER));

describe("createQuiz", () => {
  it("puts every quiz into the user's default course", async () => {
    const first = await createQuiz(USER, generatedQuiz(1));
    const second = await createQuiz(USER, generatedQuiz(1));

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

describe("listReviewSources", () => {
  it("lists the course's generated quizzes oldest first, with their question counts", async () => {
    const courseId = await addCourse(USER);
    const inCourse = { courseId, chapterIds: [] };
    const cells = await createQuiz(USER, generatedQuiz(5, "Cells"), inCourse);
    const genes = await createQuiz(USER, generatedQuiz(10, "Genes"), inCourse);
    await createQuiz(USER, generatedQuiz(5, "Review"), { ...inCourse, kind: "review" });
    await createQuiz(USER, generatedQuiz(5, "In another course"), {
      courseId: await addCourse(OTHER_USER),
      chapterIds: [],
    });

    expect(await listReviewSources(USER, courseId)).toEqual([
      { id: cells, name: "Cells", questionCount: 5 },
      { id: genes, name: "Genes", questionCount: 10 },
    ]);
    expect(await listReviewSources(OTHER_USER, courseId)).toEqual([]);
  });
});
