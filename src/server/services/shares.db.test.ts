import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { courses, quizzes, rateLimits } from "@/db/schema";
import { addCourse, createUsers, deleteUsers } from "@/test/db-fixtures";
import { generatedQuiz } from "@/test/generated-quiz";
import { createQuiz, getQuizWithQuestions } from "./quizzes";
import { getSharedQuiz, saveSharedQuiz, shareQuiz, stopSharingQuiz } from "./shares";

const USER = "shares-db-test-user";
const OTHER_USER = "shares-db-test-other";

const resetCopyLimit = () => db.delete(rateLimits).where(eq(rateLimits.key, `shared-copy:${USER}`));

beforeEach(async () => {
  await createUsers(USER, OTHER_USER);
  await resetCopyLimit();
});
afterAll(async () => {
  await deleteUsers(USER, OTHER_USER);
  await resetCopyLimit();
});

describe("shareQuiz", () => {
  it("gives the quiz a URL-safe token and keeps it when shared again", async () => {
    const quizId = await createQuiz(USER, generatedQuiz(2));

    const token = await shareQuiz(USER, quizId);
    expect(token).toMatch(/^[\w-]{32}$/);
    expect(await shareQuiz(USER, quizId)).toBe(token);
    expect(await shareQuiz(USER, await createQuiz(USER, generatedQuiz(2)))).not.toBe(token);
  });

  it("shares review quizzes but not exams or another user's quiz", async () => {
    const courseId = await addCourse(USER);
    const origin = { courseId, chapterIds: [] };
    const review = await createQuiz(USER, generatedQuiz(2), { ...origin, kind: "review" });
    const exam = await createQuiz(USER, generatedQuiz(2), { ...origin, kind: "exam" });
    const othersQuiz = await createQuiz(OTHER_USER, generatedQuiz(2));

    expect(await shareQuiz(USER, review)).toBeDefined();
    expect(await shareQuiz(USER, exam)).toBeUndefined();
    expect(await shareQuiz(USER, othersQuiz)).toBeUndefined();
    expect(await shareQuiz(USER, 2147483000)).toBeUndefined();
  });
});

describe("getSharedQuiz", () => {
  it("returns the quiz with its questions and answers for the token", async () => {
    const quizId = await createQuiz(USER, generatedQuiz(2));
    const token = await shareQuiz(USER, quizId);

    const quiz = await getSharedQuiz(token!);
    expect(quiz).toMatchObject({ id: quizId, name: "Cells", ownerId: USER });
    expect(quiz!.questions.map((question) => question.questionText)).toEqual([
      "Cells 1?",
      "Cells 2?",
    ]);
    expect(quiz!.questions[0].answers[0]).toMatchObject({ answerText: "Right", isCorrect: true });
    expect(await getSharedQuiz("x".repeat(32))).toBeUndefined();
  });
});

describe("stopSharingQuiz", () => {
  it("turns the link off, and sharing again makes a new one", async () => {
    const quizId = await createQuiz(USER, generatedQuiz(2));
    const token = await shareQuiz(USER, quizId);

    expect(await stopSharingQuiz(USER, quizId)).toBe(true);
    expect(await getSharedQuiz(token!)).toBeUndefined();
    expect(await shareQuiz(USER, quizId)).not.toBe(token);
  });

  it("leaves another user's quiz shared", async () => {
    const othersQuiz = await createQuiz(OTHER_USER, generatedQuiz(2));
    const token = await shareQuiz(OTHER_USER, othersQuiz);

    expect(await stopSharingQuiz(USER, othersQuiz)).toBe(false);
    expect(await getSharedQuiz(token!)).toBeDefined();
  });
});

describe("saveSharedQuiz", () => {
  it("copies the questions, answers and explanations into the user's folder", async () => {
    const original = await createQuiz(OTHER_USER, generatedQuiz(3));
    const token = await shareQuiz(OTHER_USER, original);

    const result = await saveSharedQuiz(USER, token!);
    if (!("quizId" in result)) throw new Error(`Not copied: ${result.error}`);

    const copy = await getQuizWithQuestions(USER, result.quizId);
    const source = await getQuizWithQuestions(OTHER_USER, original);
    const content = (quiz: typeof copy) =>
      quiz!.questions.map(({ questionText, explanation, answers }) => ({
        questionText,
        explanation,
        answers: answers.map(({ answerText, isCorrect }) => ({ answerText, isCorrect })),
      }));
    expect(content(copy)).toEqual(content(source));
    expect(copy).toMatchObject({ name: "Cells", kind: "generated" });

    const [folder] = await db
      .select({ isDefault: courses.isDefault, shareToken: quizzes.shareToken })
      .from(quizzes)
      .innerJoin(courses, eq(courses.id, quizzes.courseId))
      .where(eq(quizzes.id, result.quizId));
    expect(folder).toEqual({ isDefault: true, shareToken: null });
  });

  it("refuses the owner's own quiz and links that were turned off", async () => {
    const ownQuiz = await createQuiz(USER, generatedQuiz(2));
    expect(await saveSharedQuiz(USER, (await shareQuiz(USER, ownQuiz))!)).toEqual({
      error: "own-quiz",
    });

    const othersQuiz = await createQuiz(OTHER_USER, generatedQuiz(2));
    const token = await shareQuiz(OTHER_USER, othersQuiz);
    await stopSharingQuiz(OTHER_USER, othersQuiz);
    expect(await saveSharedQuiz(USER, token!)).toEqual({ error: "not-found" });
  });

  it("allows 10 copies every 10 minutes", async () => {
    const token = await shareQuiz(OTHER_USER, await createQuiz(OTHER_USER, generatedQuiz(1)));

    for (let i = 0; i < 10; i++) {
      expect(await saveSharedQuiz(USER, token!)).toHaveProperty("quizId");
    }
    expect(await saveSharedQuiz(USER, token!)).toEqual({ error: "rate-limit" });
  });
});
