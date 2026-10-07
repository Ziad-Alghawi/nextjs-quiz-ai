import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questionAnswers, questions, quizzes } from "@/db/schema";
import type { GeneratedQuiz } from "@/lib/validations/quiz";

/** Stores a generated quiz with its questions and answers in one transaction (three inserts). */
export async function createQuiz(quiz: GeneratedQuiz, userId: string) {
  return db.transaction(async (tx) => {
    const [{ quizId }] = await tx
      .insert(quizzes)
      .values({ name: quiz.name, description: quiz.description, userId })
      .returning({ quizId: quizzes.id });

    const inserted = await tx
      .insert(questions)
      .values(quiz.questions.map((question) => ({ questionText: question.questionText, quizId })))
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

    return quizId;
  });
}

/** The quiz with its questions and answers, only if it belongs to the user. */
export function getQuizWithQuestions(quizId: number, userId: string) {
  return db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)),
    with: { questions: { with: { answers: true } } },
  });
}

export function listQuizzes(userId: string) {
  return db.query.quizzes.findMany({ where: eq(quizzes.userId, userId) });
}
