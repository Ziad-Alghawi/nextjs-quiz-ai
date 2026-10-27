import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { addCourse, createUsers, deleteUsers } from "@/test/db-fixtures";
import { generatedQuiz } from "@/test/generated-quiz";
import { createQuiz } from "./quizzes";
import { getSharedQuiz, shareQuiz, stopSharingQuiz } from "./shares";

const USER = "shares-db-test-user";
const OTHER_USER = "shares-db-test-other";

beforeEach(() => createUsers(USER, OTHER_USER));
afterAll(() => deleteUsers(USER, OTHER_USER));

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
    expect(quiz).toMatchObject({ id: quizId, name: "Cells" });
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
