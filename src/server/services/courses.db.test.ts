import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { chapters, courses, quizzes } from "@/db/schema";
import { MAX_COURSES_PER_USER } from "@/lib/plans";
import { createUsers, deleteUsers } from "@/test/db-fixtures";
import {
  createCourse,
  deleteCourse,
  getCourse,
  getOrCreateDefaultCourse,
  listCourses,
  renameCourse,
} from "./courses";

const USER = "courses-db-test-user";
const OTHER_USER = "courses-db-test-other-user";

const newCourse = async (userId: string, name: string) => {
  const result = await createCourse(userId, name);
  if (!("id" in result)) throw new Error(`Course not created: ${result.error}`);
  return result.id;
};

beforeEach(() => createUsers(USER, OTHER_USER));
afterAll(() => deleteUsers(USER, OTHER_USER));

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
      .insert(chapters)
      .values({ courseId, name: "ch1.pdf", text: "Cells.", pageCount: 1, sizeBytes: 100 });
    await db.insert(quizzes).values({ name: "Cells", userId: USER, courseId });

    expect(await deleteCourse(USER, courseId)).toBe(true);
    expect(await db.select().from(chapters).where(eq(chapters.courseId, courseId))).toEqual([]);
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
    expect(rows).toEqual([
      expect.objectContaining({ id: ids[0], name: "My quizzes", isDefault: true }),
    ]);
    expect(new Set(ids)).toEqual(new Set([ids[0]]));
  });

  it("finds the folder by its flag, not by its name", async () => {
    const [folder] = await db
      .insert(courses)
      .values({ userId: USER, name: "Renamed long ago", isDefault: true })
      .returning({ id: courses.id });

    expect(await getOrCreateDefaultCourse(db, USER)).toBe(folder.id);
    expect(await db.select().from(courses).where(eq(courses.userId, USER))).toHaveLength(1);
  });
});

describe('the "My quizzes" folder', () => {
  it("can't be renamed or deleted", async () => {
    const folderId = await getOrCreateDefaultCourse(db, USER);

    expect(await renameCourse(USER, folderId, "Biology")).toBe("not-found");
    expect(await deleteCourse(USER, folderId)).toBe(false);
    expect(await getCourse(USER, folderId)).toEqual(
      expect.objectContaining({ name: "My quizzes", isDefault: true }),
    );
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

  it('list "My quizzes" first even when it was created after the others', async () => {
    await newCourse(USER, "Biology");
    await getOrCreateDefaultCourse(db, USER);
    await newCourse(USER, "Chemistry");

    expect((await listCourses(USER)).map((course) => course.name)).toEqual([
      "My quizzes",
      "Biology",
      "Chemistry",
    ]);
  });

  it("returns the course with its chapters and quizzes, newest quiz first", async () => {
    const courseId = await newCourse(USER, "Biology");
    await db
      .insert(chapters)
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
    expect(course?.chapters).toEqual([
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
