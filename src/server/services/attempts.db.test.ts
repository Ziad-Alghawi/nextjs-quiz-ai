import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";
import { addCourse, createUsers, deleteUsers } from "@/test/db-fixtures";
import { generatedQuiz } from "@/test/generated-quiz";
import { getAttempt, listCourseAttempts, saveAttempt } from "./attempts";
import { createQuiz, getQuizWithQuestions } from "./quizzes";

const USER = "attempts-db-test-user";
const OTHER_USER = "attempts-db-test-other";

beforeEach(() => createUsers(USER, OTHER_USER));
afterAll(() => deleteUsers(USER, OTHER_USER));

/** A quiz with `size` questions in the course (or "My quizzes"); answers[0] is the correct one. */
const addQuiz = (size: number, courseId?: number, userId = USER) =>
  createQuiz(userId, generatedQuiz(size), courseId ? { courseId, chapterIds: [] } : undefined);

/** Saves an attempt at the quiz with the first `correct` questions right and returns its id. */
async function attempt(quizId: number, correct: number, userId = USER) {
  const quiz = await getQuizWithQuestions(userId, quizId);
  const answers = quiz!.questions.map((question, i) => ({
    questionId: question.id,
    answerId: question.answers[i < correct ? 0 : 1].id,
  }));
  const result = await saveAttempt(userId, quizId, answers);
  if ("error" in result) throw new Error(result.error);
  return result.attemptId;
}

describe("getAttempt", () => {
  it("returns the user's attempt with its answers in question order", async () => {
    const quizId = await addQuiz(2);
    const quiz = await getQuizWithQuestions(USER, quizId);
    const attemptId = await attempt(quizId, 1);

    expect(await getAttempt(USER, attemptId)).toMatchObject({
      id: attemptId,
      quizId,
      score: 1,
      totalQuestions: 2,
      answers: [
        { questionId: quiz!.questions[0].id, answerId: quiz!.questions[0].answers[0].id },
        { questionId: quiz!.questions[1].id, answerId: quiz!.questions[1].answers[1].id },
      ],
    });
    expect(await getAttempt(OTHER_USER, attemptId)).toBeUndefined();
  });

  it("returns attempts saved before answers were stored without answers", async () => {
    const quizId = await addQuiz(2);
    const [old] = await db
      .insert(quizAttempts)
      .values({ quizId, userId: USER, score: 2, totalQuestions: 2 })
      .returning();

    expect(await getAttempt(USER, old.id)).toMatchObject({ score: 2, answers: [] });
  });
});

describe("listCourseAttempts", () => {
  it("groups the course's attempts by quiz, newest first, with the best one", async () => {
    const courseId = await addCourse(USER);
    const cells = await addQuiz(4, courseId);
    const genes = await addQuiz(2, courseId);
    const elsewhere = await addQuiz(2);
    const cellsFirst = await attempt(cells, 3);
    const cellsSecond = await attempt(cells, 1);
    const cellsTie = await attempt(cells, 3);
    const genesOnly = await attempt(genes, 0);
    await attempt(elsewhere, 2);

    const byQuiz = await listCourseAttempts(USER, courseId);

    expect([...byQuiz.keys()].sort()).toEqual([cells, genes].sort());
    expect(byQuiz.get(cells)!.attempts.map((a) => a.id)).toEqual([
      cellsTie,
      cellsSecond,
      cellsFirst,
    ]);
    expect(byQuiz.get(cells)!.best).toMatchObject({ id: cellsTie, score: 3, totalQuestions: 4 });
    expect(byQuiz.get(genes)!.best.id).toBe(genesOnly);
    expect((await listCourseAttempts(OTHER_USER, courseId)).size).toBe(0);
  });
});
