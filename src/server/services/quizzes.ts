import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { questionAnswers, questions, quizzes } from "@/db/schema";
import type { GeneratedQuiz } from "@/lib/validations/quiz";

/** Stores a generated quiz with its questions and answers in one transaction. */
export async function createQuiz(quiz: GeneratedQuiz, userId: string) {
  return db.transaction(async (tx) => {
    const [{ quizId }] = await tx
      .insert(quizzes)
      .values({ name: quiz.name, description: quiz.description, userId })
      .returning({ quizId: quizzes.id });

    for (const question of quiz.questions) {
      const [{ questionId }] = await tx
        .insert(questions)
        .values({ questionText: question.questionText, quizId })
        .returning({ questionId: questions.id });

      await tx.insert(questionAnswers).values(
        question.answers.map((answer) => ({
          answerText: answer.answerText,
          isCorrect: answer.isCorrect,
          questionId,
        })),
      );
    }

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
