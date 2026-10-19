import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { chapters, quizChapters, quizzes } from "@/db/schema";
import { addChapter, addCourse, createUsers, deleteUsers } from "@/test/db-fixtures";
import { deleteChapter } from "./chapters";

const USER = "chapter-actions-db-test-user";
const OTHER_USER = "chapter-actions-db-test-other";

vi.mock("@/server/session", () => ({
  requireUser: async () => ({ id: USER, name: "Test", email: "test@example.com", image: null }),
}));
const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const IDLE = { status: "idle" } as const;
const form = (chapterId: string | number) => {
  const data = new FormData();
  data.set("chapterId", String(chapterId));
  return data;
};

/** A course of `userId` with one chapter and one quiz made from it. */
const courseWithChapter = async (userId: string) => {
  const courseId = await addCourse(userId);
  const chapterId = await addChapter(courseId);
  const [quiz] = await db.insert(quizzes).values({ name: "Cells", userId, courseId }).returning();
  await db.insert(quizChapters).values({ quizId: quiz.id, chapterId });
  return { courseId, chapterId, quizId: quiz.id };
};

beforeEach(async () => {
  await createUsers(USER, OTHER_USER);
  vi.clearAllMocks();
});
afterAll(() => deleteUsers(USER, OTHER_USER));

describe("deleteChapter", () => {
  it("deletes the chapter, keeps its quizzes and refreshes the course page", async () => {
    const { courseId, chapterId, quizId } = await courseWithChapter(USER);

    expect(await deleteChapter(IDLE, form(chapterId))).toEqual({ status: "saved" });

    expect(await db.select().from(chapters).where(eq(chapters.id, chapterId))).toEqual([]);
    expect(await db.select().from(quizzes).where(eq(quizzes.id, quizId))).toHaveLength(1);
    expect(await db.select().from(quizChapters).where(eq(quizChapters.quizId, quizId))).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith(`/courses/${courseId}`);
  });

  it("doesn't delete another user's chapter and rejects invalid ids", async () => {
    const { chapterId } = await courseWithChapter(OTHER_USER);

    expect(await deleteChapter(IDLE, form(chapterId))).toMatchObject({ status: "error" });
    expect(await deleteChapter(IDLE, form("abc"))).toMatchObject({ status: "error" });
    expect(await db.select().from(chapters).where(eq(chapters.id, chapterId))).toHaveLength(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
