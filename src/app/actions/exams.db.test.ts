import { asc, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { quizGenerations, quizzes, rateLimits } from "@/db/schema";
import { EXAM_BURST_LIMIT } from "@/lib/plans";
import { getOrCreateDefaultCourse } from "@/server/services/courses";
import { createQuiz } from "@/server/services/quizzes";
import { addChapter, addCourse, createUsers, deleteUsers } from "@/test/db-fixtures";
import { formData, IDLE } from "@/test/form-data";
import { generatedQuiz } from "@/test/generated-quiz";
import { createExam } from "./exams";

const USER = "exam-actions-db-test-user";
const OTHER_USER = "exam-actions-db-test-other";

vi.mock("@/server/session", () => ({
  requireUser: async () => ({ id: USER, name: "Test", email: "test@example.com", image: null }),
}));
const { revalidatePath, redirect } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  // The real redirect() throws to end the action; the test only records where it went.
  redirect: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

const form = (courseId: number, questionCount: number) => formData({ courseId, questionCount });

/** A quiz in the course with `size` questions named "<name> 1?", "<name> 2?", ... */
const addQuiz = (
  courseId: number,
  name: string,
  size: number,
  { chapterIds = [] as number[], kind = undefined as "review" | "exam" | undefined } = {},
) => createQuiz(USER, generatedQuiz(size, name), { courseId, chapterIds, kind });

const lastRedirectId = () => Number(String(redirect.mock.lastCall?.[0]).split("/").pop());

const resetExamLimit = () => db.delete(rateLimits).where(eq(rateLimits.key, `exam:${USER}`));

beforeEach(async () => {
  await createUsers(USER, OTHER_USER);
  await resetExamLimit();
  vi.clearAllMocks();
});
afterAll(async () => {
  await deleteUsers(USER, OTHER_USER);
  await resetExamLimit();
});

describe("createExam", () => {
  it("copies questions spread over all the course's quizzes into an exam and opens it", async () => {
    const courseId = await addCourse(USER);
    const [ch1, ch2] = [
      await addChapter(courseId, "ch1.pdf"),
      await addChapter(courseId, "ch2.pdf"),
    ];
    await addQuiz(courseId, "Cells", 10, { chapterIds: [ch1] });
    await addQuiz(courseId, "Genes", 10, { chapterIds: [ch2] });
    await addQuiz(courseId, "Energy", 10);

    await createExam(IDLE, form(courseId, 20));

    const examId = lastRedirectId();
    expect(redirect).toHaveBeenCalledWith(`/quizzes/${examId}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/courses/${courseId}`);
    const exam = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, examId),
      with: {
        questions: { with: { answers: { orderBy: (a) => asc(a.id) } } },
        quizChapters: true,
      },
    });
    expect(exam).toMatchObject({
      name: expect.stringMatching(/^Exam: Biology · [A-Z][a-z]{2} \d{1,2}$/),
      description: "20 questions from 3 quizzes.",
      kind: "exam",
      courseId,
    });
    const counts = new Map<string, number>();
    for (const { questionText } of exam!.questions) {
      const quizName = questionText.split(" ")[0];
      counts.set(quizName, (counts.get(quizName) ?? 0) + 1);
    }
    expect([...counts.values()].sort()).toEqual([6, 7, 7]);
    // Every copy keeps its explanation and its options, with "Right" as the only correct one.
    for (const question of exam!.questions) {
      expect(question.explanation).toMatch(/^Explanation /);
      expect(question.answers.filter((a) => a.isCorrect).map((a) => a.answerText)).toEqual([
        "Right",
      ]);
      expect(question.answers).toHaveLength(4);
    }
    expect(exam!.quizChapters.map((link) => link.chapterId).sort()).toEqual([ch1, ch2].sort());
    // No AI, so nothing counts toward the monthly quota.
    expect(await db.$count(quizGenerations, eq(quizGenerations.userId, USER))).toBe(0);
  });

  it("offers 30 questions on the Free plan", async () => {
    const courseId = await addCourse(USER);
    await addQuiz(courseId, "Cells", 15);
    await addQuiz(courseId, "Genes", 15);

    await createExam(IDLE, form(courseId, 30));

    const exam = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, lastRedirectId()),
      with: { questions: true },
    });
    expect(exam?.questions).toHaveLength(30);
  });

  it("never copies reviews or other exams", async () => {
    const courseId = await addCourse(USER);
    await addQuiz(courseId, "Cells", 10);
    await addQuiz(courseId, "Review", 10, { kind: "review" });
    await addQuiz(courseId, "Exam", 10, { kind: "exam" });

    expect(await createExam(IDLE, form(courseId, 20))).toEqual({
      status: "error",
      error: "This course's quizzes have only 10 questions together. Choose fewer questions.",
    });
    await createExam(IDLE, form(courseId, 10));
    const exam = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, lastRedirectId()),
      with: { questions: true },
    });
    expect(exam?.questions.every((q) => q.questionText.startsWith("Cells "))).toBe(true);
  });

  it("asks for a quiz first in a course without quizzes", async () => {
    const courseId = await addCourse(USER);

    expect(await createExam(IDLE, form(courseId, 10))).toEqual({
      status: "error",
      error: "Make a quiz in this course first.",
    });
  });

  it("refuses other users' and missing courses and counts that aren't offered", async () => {
    const courseId = await addCourse(USER);
    await addQuiz(courseId, "Cells", 30);
    const otherCourseId = await addCourse(OTHER_USER);
    await createQuiz(OTHER_USER, generatedQuiz(30), { courseId: otherCourseId, chapterIds: [] });

    const notFound = {
      status: "error",
      error: "This course doesn't exist anymore. Reload the page.",
    };
    expect(await createExam(IDLE, form(otherCourseId, 10))).toEqual(notFound);
    expect(await createExam(IDLE, form(2147483000, 10))).toEqual(notFound);
    // Quick quizzes land in the "My quizzes" folder, which isn't a course.
    await createQuiz(USER, generatedQuiz(30));
    expect(await createExam(IDLE, form(await getOrCreateDefaultCourse(USER, db), 10))).toEqual(
      notFound,
    );
    for (const count of [15, 25]) {
      expect(await createExam(IDLE, form(courseId, count))).toEqual({
        status: "error",
        error: "Choose one of the offered question counts.",
      });
    }
    expect(redirect).not.toHaveBeenCalled();
  });

  it(`stops after ${EXAM_BURST_LIMIT.max} exams in the window`, async () => {
    const courseId = await addCourse(USER);
    await addQuiz(courseId, "Cells", 10);

    for (let i = 0; i < EXAM_BURST_LIMIT.max; i++) {
      await createExam(IDLE, form(courseId, 10));
    }
    expect(redirect).toHaveBeenCalledTimes(EXAM_BURST_LIMIT.max);
    expect(await createExam(IDLE, form(courseId, 10))).toEqual({
      status: "error",
      error: expect.stringContaining("Please try again in a few minutes."),
    });
  });
});
