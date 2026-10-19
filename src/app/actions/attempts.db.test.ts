import { asc, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { attemptAnswers, quizAttempts, quizzes } from "@/db/schema";
import { createQuiz, getQuizWithQuestions } from "@/server/services/quizzes";
import { createUsers, deleteUsers } from "@/test/db-fixtures";
import { formData, IDLE } from "@/test/form-data";
import { generatedQuiz } from "@/test/generated-quiz";
import { deleteAttempt, submitQuiz } from "./attempts";

const USER = "attempt-actions-db-test-user";
const OTHER_USER = "attempt-actions-db-test-other";

const { session, revalidatePath } = vi.hoisted(() => ({
  session: { user: null as { id: string } | null },
  revalidatePath: vi.fn(),
}));
vi.mock("@/server/session", () => ({
  getCurrentUser: async () => session.user,
  requireUser: async () => session.user,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

/** A quiz of `userId` with three questions; answers[0] of each question is the correct one. */
async function addQuiz(userId = USER) {
  const quizId = await createQuiz(generatedQuiz(3), userId);
  const quiz = await getQuizWithQuestions(quizId, userId);
  return { quizId, questions: quiz!.questions };
}

const attemptsOf = (userId: string) =>
  db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId));

const answersOf = (attemptId: number) =>
  db
    .select({ questionId: attemptAnswers.questionId, answerId: attemptAnswers.answerId })
    .from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId))
    .orderBy(asc(attemptAnswers.questionId));

beforeEach(async () => {
  await createUsers(USER, OTHER_USER);
  session.user = { id: USER };
  vi.clearAllMocks();
});
afterAll(() => deleteUsers(USER, OTHER_USER));

describe("submitQuiz", () => {
  it("scores on the server and saves the attempt with the chosen answers", async () => {
    const { quizId, questions } = await addQuiz();
    const chosen = [
      { questionId: questions[0].id, answerId: questions[0].answers[0].id },
      { questionId: questions[1].id, answerId: questions[1].answers[2].id },
      { questionId: questions[2].id, answerId: questions[2].answers[0].id },
    ];

    const result = await submitQuiz({ quizId, answers: chosen });

    const [attempt] = await attemptsOf(USER);
    expect(result).toEqual({ status: "saved", attemptId: attempt.id, score: 2, total: 3 });
    expect(attempt).toMatchObject({ quizId, score: 2, totalQuestions: 3 });
    expect(await answersOf(attempt.id)).toEqual(chosen);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("keeps only the first answer per question", async () => {
    const { quizId, questions } = await addQuiz();
    const wrongFirst = { questionId: questions[0].id, answerId: questions[0].answers[1].id };
    const rest = questions.map((q) => ({ questionId: q.id, answerId: q.answers[0].id }));

    const result = await submitQuiz({ quizId, answers: [wrongFirst, ...rest] });

    expect(result).toMatchObject({ status: "saved", score: 2, total: 3 });
    const [attempt] = await attemptsOf(USER);
    expect(await answersOf(attempt.id)).toEqual([wrongFirst, ...rest.slice(1)]);
  });

  it("saves nothing when a question has no answer of its own", async () => {
    const { quizId, questions } = await addQuiz();
    const [first, second] = questions;
    // The third question gets an answer that belongs to the first one.
    const answers = [
      { questionId: first.id, answerId: first.answers[0].id },
      { questionId: second.id, answerId: second.answers[0].id },
      { questionId: questions[2].id, answerId: first.answers[0].id },
    ];

    expect(await submitQuiz({ quizId, answers })).toEqual({
      status: "error",
      error: "Answer every question before submitting.",
    });
    expect(await attemptsOf(USER)).toEqual([]);
  });

  it("refuses other users' and missing quizzes", async () => {
    const { quizId, questions } = await addQuiz(OTHER_USER);
    const answers = questions.map((q) => ({ questionId: q.id, answerId: q.answers[0].id }));
    const notFound = { status: "error", error: "This quiz doesn't exist anymore." };

    expect(await submitQuiz({ quizId, answers })).toEqual(notFound);
    await deleteUsers(OTHER_USER);
    expect(await submitQuiz({ quizId, answers })).toEqual(notFound);
    expect(await attemptsOf(USER)).toEqual([]);
  });

  it("rejects input it can't read and a missing session", async () => {
    const { quizId } = await addQuiz();

    expect(await submitQuiz({ quizId: 0, answers: [] })).toEqual({
      status: "error",
      error: "Your answers couldn't be read.",
    });
    session.user = null;
    expect(await submitQuiz({ quizId, answers: [] })).toEqual({
      status: "error",
      error: expect.stringContaining("session has expired"),
    });
    expect(await attemptsOf(USER)).toEqual([]);
  });
});

describe("deleteAttempt", () => {
  /** Submits an attempt with every answer right and returns it. */
  async function submitAttempt() {
    const { quizId, questions } = await addQuiz();
    const answers = questions.map((q) => ({ questionId: q.id, answerId: q.answers[0].id }));
    await submitQuiz({ quizId, answers });
    const [attempt] = await attemptsOf(USER);
    return attempt;
  }

  it("deletes the user's attempt with its answers and refreshes the course and the dashboard", async () => {
    const attempt = await submitAttempt();
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, attempt.quizId));
    vi.clearAllMocks();

    expect(await deleteAttempt(IDLE, formData({ attemptId: attempt.id }))).toEqual({
      status: "saved",
    });
    expect(await attemptsOf(USER)).toEqual([]);
    expect(await answersOf(attempt.id)).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith(`/courses/${quiz.courseId}`);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("refuses other users' attempts and unreadable ids", async () => {
    const attempt = await submitAttempt();
    session.user = { id: OTHER_USER };
    const notFound = { status: "error", error: expect.stringContaining("doesn't exist anymore") };

    expect(await deleteAttempt(IDLE, formData({ attemptId: attempt.id }))).toEqual(notFound);
    expect(await deleteAttempt(IDLE, formData({ attemptId: "abc" }))).toEqual(notFound);
    expect(await attemptsOf(USER)).toHaveLength(1);
  });
});
