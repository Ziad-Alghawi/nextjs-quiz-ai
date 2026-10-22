import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { quizAttempts, quizzes } from "@/db/schema";
import { getOrCreateDefaultCourse } from "@/server/services/courses";
import { createQuiz } from "@/server/services/quizzes";
import { addCourse, createUsers, deleteUsers } from "@/test/db-fixtures";
import { formData, IDLE } from "@/test/form-data";
import { generatedQuiz } from "@/test/generated-quiz";
import { moveQuiz } from "./quizzes";

const USER = "quiz-actions-db-test-user";
const OTHER_USER = "quiz-actions-db-test-other";

vi.mock("@/server/session", () => ({
  requireUser: async () => ({ id: USER, name: "Test", email: "test@example.com", image: null }),
}));
const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const NOT_FOUND = {
  status: "error",
  error: "This quiz or course doesn't exist anymore. Reload the page.",
};

const courseOf = async (quizId: number) => {
  const [quiz] = await db
    .select({ courseId: quizzes.courseId })
    .from(quizzes)
    .where(eq(quizzes.id, quizId));
  return quiz.courseId;
};

beforeEach(async () => {
  await createUsers(USER, OTHER_USER);
  vi.clearAllMocks();
});
afterAll(() => deleteUsers(USER, OTHER_USER));

describe("moveQuiz", () => {
  it('moves a quick quiz from "My quizzes" into a course, with its attempts', async () => {
    const quizId = await createQuiz(generatedQuiz(5), USER);
    const courseId = await addCourse(USER);
    await db.insert(quizAttempts).values({ quizId, userId: USER, score: 4, totalQuestions: 5 });

    expect(await moveQuiz(IDLE, formData({ quizId, courseId }))).toEqual({ status: "saved" });

    expect(await courseOf(quizId)).toBe(courseId);
    const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.quizId, quizId));
    expect(attempts).toHaveLength(1);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("leaves quizzes that are already in a course where they are", async () => {
    const biology = await addCourse(USER, "Biology");
    const chemistry = await addCourse(USER, "Chemistry");
    const quizId = await createQuiz(generatedQuiz(5), USER, { courseId: biology, chapterIds: [] });

    expect(await moveQuiz(IDLE, formData({ quizId, courseId: chemistry }))).toEqual(NOT_FOUND);
    expect(await courseOf(quizId)).toBe(biology);
  });

  it("only moves into the user's own courses, not into a folder", async () => {
    const quizId = await createQuiz(generatedQuiz(5), USER);
    const folderId = await courseOf(quizId);
    const othersCourse = await addCourse(OTHER_USER);
    const othersFolder = await getOrCreateDefaultCourse(db, OTHER_USER);

    for (const courseId of [othersCourse, othersFolder, folderId, 2147483000]) {
      expect(await moveQuiz(IDLE, formData({ quizId, courseId }))).toEqual(NOT_FOUND);
    }
    expect(await courseOf(quizId)).toBe(folderId);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses another user's quick quiz and invalid fields", async () => {
    const othersQuiz = await createQuiz(generatedQuiz(5), OTHER_USER);
    const courseId = await addCourse(USER);

    expect(await moveQuiz(IDLE, formData({ quizId: othersQuiz, courseId }))).toEqual(NOT_FOUND);
    expect(await moveQuiz(IDLE, formData({ quizId: "abc", courseId }))).toEqual(NOT_FOUND);
    expect(await moveQuiz(IDLE, formData({ quizId: othersQuiz }))).toEqual(NOT_FOUND);
    expect(await courseOf(othersQuiz)).not.toBe(courseId);
  });
});
