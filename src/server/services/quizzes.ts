import "server-only";
import { eq } from "drizzle-orm";
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

export function getQuizWithQuestions(quizId: number) {
  return db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
    with: { questions: { with: { answers: true } } },
  });
}

export function listQuizzes(userId: string) {
  return db.query.quizzes.findMany({ where: eq(quizzes.userId, userId) });
}
