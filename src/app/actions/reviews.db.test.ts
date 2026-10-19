import { asc, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { quizChapters, quizGenerations, quizzes, rateLimits, users } from "@/db/schema";
import { REVIEW_BURST_LIMIT } from "@/lib/plans";
import { createQuiz, listReviewSources } from "@/server/services/quizzes";
import { addChapter, addCourse, createUsers, deleteUsers } from "@/test/db-fixtures";
import { formData, IDLE } from "@/test/form-data";
import { generatedQuiz } from "@/test/generated-quiz";
import { createReview } from "./reviews";

const USER = "review-actions-db-test-user";
const OTHER_USER = "review-actions-db-test-other";

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

const form = (courseId: number, quizIds: number[], questionCount: number) =>
  formData({ courseId, quizIds, questionCount });

/** A generated quiz in the course with `size` questions named "<name> 1?", "<name> 2?", ... */
const addQuiz = (courseId: number, name: string, size: number, chapterIds: number[] = []) =>
  createQuiz(generatedQuiz(size, name), USER, { courseId, chapterIds });

const lastRedirectId = () => Number(String(redirect.mock.lastCall?.[0]).split("/").pop());

const resetReviewLimit = () => db.delete(rateLimits).where(eq(rateLimits.key, `review:${USER}`));

beforeEach(async () => {
  await createUsers(USER, OTHER_USER);
  await resetReviewLimit();
  vi.clearAllMocks();
});
afterAll(async () => {
  await deleteUsers(USER, OTHER_USER);
  await resetReviewLimit();
});

describe("createReview", () => {
  it("copies balanced questions with answers and explanations into a review of the course", async () => {
    const courseId = await addCourse(USER);
    const [ch1, ch2] = [
      await addChapter(courseId, "ch1.pdf"),
      await addChapter(courseId, "ch2.pdf"),
    ];
    const cells = await addQuiz(courseId, "Cells", 10, [ch1]);
    const genes = await addQuiz(courseId, "Genes", 10, [ch2]);
    const energy = await addQuiz(courseId, "Energy", 10, [ch1]);

    await createReview(IDLE, form(courseId, [energy, cells, genes], 10));

    expect(revalidatePath).toHaveBeenCalledWith(`/courses/${courseId}`);
    const review = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, lastRedirectId()),
      with: {
        questions: { with: { answers: { orderBy: (a) => asc(a.id) } } },
        quizChapters: true,
      },
    });
    expect(review).toMatchObject({
      name: "Review: Cells + 2 more",
      description: "Questions from: Cells, Genes, Energy.",
      kind: "review",
      courseId,
    });
    const perQuiz = review!.questions.map((q) => q.questionText.split(" ")[0]);
    expect(
      ["Cells", "Genes", "Energy"].map((name) => perQuiz.filter((n) => n === name).length).sort(),
    ).toEqual([3, 3, 4]);
    expect(review!.questions[0]).toMatchObject({
      explanation: expect.stringMatching(/^Explanation /),
      answers: [
        { answerText: "Right", isCorrect: true },
        { answerText: "Wrong 1", isCorrect: false },
        { answerText: "Wrong 2", isCorrect: false },
        { answerText: "Wrong 3", isCorrect: false },
      ],
    });
    expect(review!.quizChapters.map((link) => link.chapterId).sort()).toEqual([ch1, ch2].sort());
    // No AI, so nothing counts toward the monthly quota.
    expect(await db.select().from(quizGenerations).where(eq(quizGenerations.userId, USER))).toEqual(
      [],
    );
  });

  it("names two quizzes and works without chapters", async () => {
    const courseId = await addCourse(USER);
    const cells = await addQuiz(courseId, "Cells", 5);
    const genes = await addQuiz(courseId, "Genes", 5);

    await createReview(IDLE, form(courseId, [cells, genes], 5));

    const review = await db.query.quizzes.findFirst({ where: eq(quizzes.id, lastRedirectId()) });
    expect(review?.name).toBe("Review: Cells, Genes");
    expect(await db.select().from(quizChapters).where(eq(quizChapters.quizId, review!.id))).toEqual(
      [],
    );
  });

  it("refuses reviews, other courses' and other users' quizzes as sources", async () => {
    const courseId = await addCourse(USER);
    const otherCourseId = await addCourse(OTHER_USER);
    const cells = await addQuiz(courseId, "Cells", 5);
    const genes = await addQuiz(courseId, "Genes", 5);
    const [othersQuiz] = await db
      .insert(quizzes)
      .values({ name: "Theirs", userId: OTHER_USER, courseId: otherCourseId })
      .returning();
    await createReview(IDLE, form(courseId, [cells, genes], 5));
    const review = lastRedirectId();
    redirect.mockClear();

    const notFound = { status: "error", error: expect.stringContaining("don't exist anymore") };
    expect(await createReview(IDLE, form(courseId, [cells, review], 5))).toEqual(notFound);
    expect(await createReview(IDLE, form(courseId, [cells, othersQuiz.id], 5))).toEqual(notFound);
    expect(await createReview(IDLE, form(otherCourseId, [cells, genes], 5))).toEqual(notFound);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("checks the quiz and question counts", async () => {
    const courseId = await addCourse(USER);
    const cells = await addQuiz(courseId, "Cells", 5);
    const genes = await addQuiz(courseId, "Genes", 5);

    expect(await createReview(IDLE, form(courseId, [cells, cells], 5))).toEqual({
      status: "error",
      error: "Select at least two quizzes.",
    });
    expect(await createReview(IDLE, form(courseId, [cells, genes], 15))).toEqual({
      status: "error",
      error: "These quizzes have only 10 questions together. Choose fewer questions.",
    });
    expect(await createReview(IDLE, form(courseId, [cells, genes], 7))).toMatchObject({
      status: "error",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("allows 20 and 25 questions only on Pro", async () => {
    const courseId = await addCourse(USER);
    const cells = await addQuiz(courseId, "Cells", 15);
    const genes = await addQuiz(courseId, "Genes", 15);

    expect(await createReview(IDLE, form(courseId, [cells, genes], 20))).toEqual({
      status: "error",
      error: expect.stringContaining("part of Pro"),
    });

    await db.update(users).set({ subscribed: true }).where(eq(users.id, USER));
    await createReview(IDLE, form(courseId, [cells, genes], 20));
    expect(redirect).toHaveBeenCalledOnce();
  });

  it(`stops after ${REVIEW_BURST_LIMIT.reviews} reviews in the window`, async () => {
    const courseId = await addCourse(USER);
    const cells = await addQuiz(courseId, "Cells", 5);
    const genes = await addQuiz(courseId, "Genes", 5);

    for (let i = 0; i < REVIEW_BURST_LIMIT.reviews; i++) {
      await createReview(IDLE, form(courseId, [cells, genes], 5));
    }
    expect(redirect).toHaveBeenCalledTimes(REVIEW_BURST_LIMIT.reviews);
    expect(await createReview(IDLE, form(courseId, [cells, genes], 5))).toEqual({
      status: "error",
      error: expect.stringContaining("Please try again in a few minutes."),
    });
  });
});

describe("listReviewSources", () => {
  it("lists the course's generated quizzes oldest first, with their question counts", async () => {
    const courseId = await addCourse(USER);
    const cells = await addQuiz(courseId, "Cells", 5);
    const genes = await addQuiz(courseId, "Genes", 10);
    await addQuiz(await addCourse(OTHER_USER), "In another course", 5);
    await createReview(IDLE, form(courseId, [cells, genes], 5));

    expect(await listReviewSources(USER, courseId)).toEqual([
      { id: cells, name: "Cells", questionCount: 5 },
      { id: genes, name: "Genes", questionCount: 10 },
    ]);
    expect(await listReviewSources(OTHER_USER, courseId)).toEqual([]);
  });
});
