import { db } from "@/db";
import { quizzes, questions as dbQuestions, questionAnswers } from "@/db/schema";
import { InferInsertModel } from "drizzle-orm";

// Define types based on the database schema
type Quizz = InferInsertModel<typeof quizzes>;
type Question = InferInsertModel<typeof dbQuestions>;
type Answer = InferInsertModel<typeof questionAnswers>;

// Define the structure of the quizz data to be saved
interface SaveQuizzData extends Quizz {
  questions: Array<Question & { answers: Answer[] }>;
}

// Function to save the quizz data to the database
export default async function saveQuizz(quizzData: SaveQuizzData, userId?: string) {
  const { name, description, questions } = quizzData;
  const quizzId = await db.transaction(async (tx) => {
    const newQuizz = await tx
      .insert(quizzes)
      .values({
        name,
        description,
        userId: userId ?? null,
      })
      .returning({ insertedId: quizzes.id });

    const insertedQuizzId = newQuizz[0].insertedId;

    for (const question of questions) {
      const [{ questionId }] = await tx
        .insert(dbQuestions)
        .values({
          questionText: question.questionText,
          quizId: insertedQuizzId,
        })
        .returning({ questionId: dbQuestions.id });

      // Insert answers for the question
      if (question.answers && question.answers.length > 0) {
        // Map the answers to include the questionId
        await tx.insert(questionAnswers).values(
          question.answers.map((answer) => ({
            answerText: answer.answerText,
            isCorrect: answer.isCorrect,
            questionId,
          })),
        );
      }
    }

    return insertedQuizzId;
  });

  return { quizzId };
}
