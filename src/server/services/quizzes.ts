import "server-only";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { questionAnswers, questions, quizChapters, quizzes } from "@/db/schema";
import { isQuestionCountAllowed, REVIEW_BURST_LIMIT } from "@/lib/plans";
import { pickReviewQuestions, reviewName } from "@/lib/review";
import { MINUTE_MS } from "@/lib/time";
import type { GeneratedQuiz } from "@/lib/validations/quiz";
import { getOrCreateDefaultCourse } from "./courses";
import { consumeRateLimit } from "./rate-limit";
import { getPlan } from "./usage";

type QuizQuestion = Omit<GeneratedQuiz["questions"][number], "explanation"> & {
  // Copied questions from quizzes made before explanations existed have none.
  explanation: string | null;
};

type NewQuiz = Omit<GeneratedQuiz, "questions"> & { questions: QuizQuestion[] };

/**
 * Stores a generated quiz with its questions and answers in one transaction. `origin` puts it in a
 * course, linked to the chapters it was made from (the caller checked they are the user's);
 * without it, the quiz goes into the user's "My quizzes" course.
 */
export async function createQuiz(
  quiz: NewQuiz,
  userId: string,
  origin?: { courseId: number; chapterIds: number[]; kind?: "review" | "exam" },
) {
  return db.transaction(async (tx) => {
    const courseId = origin?.courseId ?? (await getOrCreateDefaultCourse(tx, userId));
    const [{ quizId }] = await tx
      .insert(quizzes)
      .values({
        name: quiz.name,
        description: quiz.description,
        kind: origin?.kind,
        userId,
        courseId,
      })
      .returning({ quizId: quizzes.id });

    const inserted = await tx
      .insert(questions)
      .values(
        quiz.questions.map(({ questionText, explanation }) => ({
          questionText,
          explanation,
          quizId,
        })),
      )
      .returning({ id: questions.id });
    // Serial ids are handed out in VALUES order, so sorting them restores the input order.
    const questionIds = inserted.map((row) => row.id).sort((a, b) => a - b);

    await tx.insert(questionAnswers).values(
      quiz.questions.flatMap((question, index) =>
        question.answers.map((answer) => ({
          answerText: answer.answerText,
          isCorrect: answer.isCorrect,
          questionId: questionIds[index],
        })),
      ),
    );

    // A review of quizzes whose chapters were deleted (or Quick quizzes) has no chapters.
    if (origin && origin.chapterIds.length > 0) {
      await tx
        .insert(quizChapters)
        .values(origin.chapterIds.map((chapterId) => ({ quizId, chapterId })));
    }

    return quizId;
  });
}

/**
 * The quiz with its questions and answers in the order they were created, only if it belongs to the
 * user. Without orderBy, Postgres may return the rows in a different order on every load.
 */
export function getQuizWithQuestions(quizId: number, userId: string) {
  return db.query.quizzes.findFirst({
    columns: { id: true, name: true, kind: true, courseId: true },
    where: and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)),
    with: {
      questions: {
        columns: { id: true, questionText: true, explanation: true },
        orderBy: asc(questions.id),
        with: {
          answers: {
            columns: { id: true, answerText: true, isCorrect: true },
            orderBy: asc(questionAnswers.id),
          },
        },
      },
    },
  });
}

export type QuizWithQuestions = NonNullable<Awaited<ReturnType<typeof getQuizWithQuestions>>>;

/** The user's quizzes, newest first. */
export function listQuizzes(userId: string) {
  return db.query.quizzes.findMany({
    columns: { id: true, name: true, description: true },
    where: eq(quizzes.userId, userId),
    orderBy: desc(quizzes.createdAt),
  });
}

export type QuizSummary = Awaited<ReturnType<typeof listQuizzes>>[number];

/** The course's generated quizzes a review can use, oldest first, with how many questions each has. */
export function listReviewSources(userId: string, courseId: number) {
  return db
    .select({ id: quizzes.id, name: quizzes.name, questionCount: count(questions.id) })
    .from(quizzes)
    .innerJoin(questions, eq(questions.quizId, quizzes.id))
    .where(
      and(
        eq(quizzes.userId, userId),
        eq(quizzes.courseId, courseId),
        eq(quizzes.kind, "generated"),
      ),
    )
    .groupBy(quizzes.id)
    .orderBy(asc(quizzes.id));
}

type ReviewResult =
  | { quizId: number }
  | { error: "not-found" | "plan" | "rate-limit" }
  | { error: "too-few"; available: number };

/**
 * Makes a review quiz in the course from questions of its generated quizzes, with their answers and
 * explanations, spread evenly over the quizzes. No AI, so it doesn't count toward the monthly quota.
 */
export async function createReviewQuiz(
  userId: string,
  input: { courseId: number; quizIds: number[]; questionCount: number },
): Promise<ReviewResult> {
  const { reviews, windowMinutes } = REVIEW_BURST_LIMIT;
  if (!(await consumeRateLimit(`review:${userId}`, reviews, windowMinutes * MINUTE_MS))) {
    return { error: "rate-limit" };
  }

  const plan = await getPlan(userId);
  if (!isQuestionCountAllowed(plan, input.questionCount)) {
    return { error: "plan" };
  }

  const chosen = await findCopySources(userId, input.courseId, input.quizIds);
  if (chosen.length !== input.quizIds.length) return { error: "not-found" };

  const names = chosen.map((quiz) => quiz.name);
  return copyQuestions(userId, input.courseId, chosen, input.questionCount, {
    name: reviewName(names),
    description: `Questions from: ${names.join(", ")}.`,
    kind: "review",
  });
}

/**
 * The user's generated quizzes of the course (only those in `quizIds`, if given) with what copying
 * their questions needs. Copies are not sources themselves, so a copy never copies a copy.
 */
function findCopySources(userId: string, courseId: number, quizIds?: number[]) {
  return db.query.quizzes.findMany({
    columns: { name: true },
    where: and(
      quizIds ? inArray(quizzes.id, quizIds) : undefined,
      eq(quizzes.userId, userId),
      eq(quizzes.courseId, courseId),
      eq(quizzes.kind, "generated"),
    ),
    // Oldest first, so names and descriptions follow the order of the chapters.
    orderBy: asc(quizzes.id),
    with: {
      questions: {
        columns: { questionText: true, explanation: true },
        with: {
          answers: {
            columns: { answerText: true, isCorrect: true },
            orderBy: asc(questionAnswers.id),
          },
        },
      },
      quizChapters: { columns: { chapterId: true } },
    },
  });
}

/**
 * Stores a new quiz in the course with `count` questions copied from the sources, with their answers
 * and explanations, spread evenly over them and linked to their chapters.
 */
async function copyQuestions(
  userId: string,
  courseId: number,
  sources: Awaited<ReturnType<typeof findCopySources>>,
  count: number,
  quiz: { name: string; description: string; kind: "review" },
): Promise<{ quizId: number } | { error: "too-few"; available: number }> {
  const available = sources.reduce((total, source) => total + source.questions.length, 0);
  if (available < count) return { error: "too-few", available };

  const quizId = await createQuiz(
    {
      name: quiz.name,
      description: quiz.description,
      questions: pickReviewQuestions(
        sources.map((source) => source.questions),
        count,
      ),
    },
    userId,
    {
      courseId,
      chapterIds: [
        ...new Set(sources.flatMap((source) => source.quizChapters.map((link) => link.chapterId))),
      ],
      kind: quiz.kind,
    },
  );
  return { quizId };
}
