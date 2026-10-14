import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { courses, quizzes, sources, users } from "@/db/schema";
import { MAX_COURSES_PER_USER } from "@/lib/plans";
import {
  createCourse,
  deleteCourse,
  getCourse,
  getOrCreateDefaultCourse,
  listCourses,
  renameCourse,
} from "./courses";
import { createQuiz } from "./quizzes";

const USER = "courses-db-test-user";
const OTHER_USER = "courses-db-test-other-user";

const newCourse = async (userId: string, name: string) => {
  const result = await createCourse(userId, name);
  if (!("id" in result)) throw new Error(`Course not created: ${result.error}`);
  return result.id;
};

const generatedQuiz = {
  name: "Test quiz",
  description: "A quiz for the tests.",
  questions: [
    {
      questionText: "Which one is right?",
      explanation: "Because the document says so.",
      answers: [
        { answerText: "This one", isCorrect: true },
        { answerText: "That one", isCorrect: false },
      ],
    },
  ],
};

beforeEach(async () => {
  await db.delete(users).where(inArray(users.id, [USER, OTHER_USER]));
  await db.insert(users).values([
    { id: USER, name: "Courses test", email: `${USER}@example.com` },
    { id: OTHER_USER, name: "Other user", email: `${OTHER_USER}@example.com` },
  ]);
});

afterAll(async () => {
  await db.delete(users).where(inArray(users.id, [USER, OTHER_USER]));
});

describe("createCourse", () => {
  it("rejects a name the user already has, but not another user's", async () => {
    await newCourse(USER, "Biology");

    expect(await createCourse(USER, "Biology")).toEqual({ error: "duplicate" });
    expect(await createCourse(OTHER_USER, "Biology")).toEqual({ id: expect.any(Number) });
  });

  it(`stops at ${MAX_COURSES_PER_USER} courses`, async () => {
    await db
      .insert(courses)
      .values(
        Array.from({ length: MAX_COURSES_PER_USER }, (_, i) => ({ userId: USER, name: `C${i}` })),
      );

    expect(await createCourse(USER, "One too many")).toEqual({ error: "limit" });
  });
});

describe("renameCourse", () => {
  it("renames the user's own course", async () => {
    const id = await newCourse(USER, "Biology");

    expect(await renameCourse(USER, id, "Chemistry")).toBe("renamed");
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    expect(course.name).toBe("Chemistry");
  });

  it("rejects a name the user already has", async () => {
    await newCourse(USER, "Biology");
    const id = await newCourse(USER, "Chemistry");

    expect(await renameCourse(USER, id, "Biology")).toBe("duplicate");
  });

  it("doesn't touch another user's course", async () => {
    const id = await newCourse(OTHER_USER, "Biology");

    expect(await renameCourse(USER, id, "Mine now")).toBe("not-found");
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    expect(course.name).toBe("Biology");
  });
});

describe("deleteCourse", () => {
  it("deletes the course with its chapters and quizzes", async () => {
    const courseId = await newCourse(USER, "Biology");
    await db
      .insert(sources)
      .values({ courseId, name: "ch1.pdf", text: "Cells.", pageCount: 1, sizeBytes: 100 });
    await db.insert(quizzes).values({ name: "Cells", userId: USER, courseId });

    expect(await deleteCourse(USER, courseId)).toBe(true);
    expect(await db.select().from(sources).where(eq(sources.courseId, courseId))).toEqual([]);
    expect(await db.select().from(quizzes).where(eq(quizzes.courseId, courseId))).toEqual([]);
  });

  it("doesn't delete another user's course", async () => {
    const id = await newCourse(OTHER_USER, "Biology");

    expect(await deleteCourse(USER, id)).toBe(false);
    expect(await db.select().from(courses).where(eq(courses.id, id))).toHaveLength(1);
  });
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

describe("listCourses and getCourse", () => {
  it("list only the user's courses, oldest first", async () => {
    await newCourse(USER, "Biology");
    await newCourse(OTHER_USER, "Secret");
    await newCourse(USER, "Chemistry");

    expect((await listCourses(USER)).map((course) => course.name)).toEqual([
      "Biology",
      "Chemistry",
    ]);
  });

  it("returns the course with its chapters and quizzes, newest quiz first", async () => {
    const courseId = await newCourse(USER, "Biology");
    await db
      .insert(sources)
      .values({ courseId, name: "ch1.pdf", text: "Cells.", pageCount: 3, sizeBytes: 100 });
    const [older] = await db
      .insert(quizzes)
      .values({ name: "Older", userId: USER, courseId, createdAt: new Date("2026-01-01") })
      .returning({ id: quizzes.id });
    const [newer] = await db
      .insert(quizzes)
      .values({ name: "Newer", userId: USER, courseId, createdAt: new Date("2026-02-01") })
      .returning({ id: quizzes.id });

    const course = await getCourse(USER, courseId);

    expect(course?.name).toBe("Biology");
    expect(course?.sources).toEqual([
      {
        id: expect.any(Number),
        name: "ch1.pdf",
        pageCount: 3,
        sizeBytes: 100,
        textTruncated: false,
      },
    ]);
    expect(course?.quizzes.map((quiz) => quiz.id)).toEqual([newer.id, older.id]);
  });

  it("is undefined for another user's course", async () => {
    const id = await newCourse(OTHER_USER, "Secret");

    expect(await getCourse(USER, id)).toBeUndefined();
  });
});
