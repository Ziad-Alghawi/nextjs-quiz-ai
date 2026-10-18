import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { chapters, courses, quizChapters, quizzes, users } from "@/db/schema";
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
  const [course] = await db.insert(courses).values({ userId, name: "Biology" }).returning();
  const [chapter] = await db
    .insert(chapters)
    .values({ courseId: course.id, name: "ch1.pdf", text: "Cells.", pageCount: 1, sizeBytes: 100 })
    .returning();
  const [quiz] = await db
    .insert(quizzes)
    .values({ name: "Cells", userId, courseId: course.id })
    .returning();
  await db.insert(quizChapters).values({ quizId: quiz.id, chapterId: chapter.id });
  return { course, chapter, quiz };
};

const cleanUp = () => db.delete(users).where(inArray(users.id, [USER, OTHER_USER]));

beforeEach(async () => {
  await cleanUp();
  await db.insert(users).values([
    { id: USER, name: "Test", email: `${USER}@example.com` },
    { id: OTHER_USER, name: "Other", email: `${OTHER_USER}@example.com` },
  ]);
  vi.clearAllMocks();
});
afterAll(cleanUp);

describe("deleteChapter", () => {
  it("deletes the chapter, keeps its quizzes and refreshes the course page", async () => {
    const { course, chapter, quiz } = await courseWithChapter(USER);

    expect(await deleteChapter(IDLE, form(chapter.id))).toEqual({ status: "saved" });

    expect(await db.select().from(chapters).where(eq(chapters.id, chapter.id))).toEqual([]);
    expect(await db.select().from(quizzes).where(eq(quizzes.id, quiz.id))).toHaveLength(1);
    expect(await db.select().from(quizChapters).where(eq(quizChapters.quizId, quiz.id))).toEqual(
      [],
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/courses/${course.id}`);
  });

  it("doesn't delete another user's chapter and rejects invalid ids", async () => {
    const { chapter } = await courseWithChapter(OTHER_USER);

    expect(await deleteChapter(IDLE, form(chapter.id))).toMatchObject({ status: "error" });
    expect(await deleteChapter(IDLE, form("abc"))).toMatchObject({ status: "error" });
    expect(await db.select().from(chapters).where(eq(chapters.id, chapter.id))).toHaveLength(1);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
