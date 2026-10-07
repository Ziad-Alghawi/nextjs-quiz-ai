import { quizzes, questions, users, quizzSubmissions } from "@/db/schema";
import { auth } from "@/auth";
import { count, eq, avg } from "drizzle-orm";
import { db } from "@/db";

const getUserMatrics = async () => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return;
  }

  //get the total number of questions in the quizz
  const numQuizzes = await db
    .select({ value: count() })
    .from(quizzes)
    .where(eq(quizzes.userId, userId));


  // get the total number of questions in the quizz
  const numQuestions = await db
    .select({ value: count() })
    .from(questions)
    .innerJoin(quizzes, eq(questions.quizzId, quizzes.id))
    .innerJoin(users, eq(quizzes.userId, users.id))
    .where(eq(quizzes.userId, userId));


  // get the total number of submissions for the quizz

  const numSubmissions = await db
    .select({ value: count() })
    .from(quizzSubmissions)
    .innerJoin(quizzes, eq(quizzSubmissions.quizzId, quizzes.id))
    .innerJoin(users, eq(quizzes.userId, users.id))
    .where(eq(quizzes.userId, userId));

  // get the average score for the quizz
  const avgScore = await db
    .select({ value: avg(quizzSubmissions.score) })
    .from(quizzSubmissions)
    .innerJoin(quizzes, eq(quizzSubmissions.quizzId, quizzes.id))
    .innerJoin(users, eq(quizzes.userId, users.id))
    .where(eq(quizzes.userId, userId));


  return [
    { label: "Quizzes", value: numQuizzes[0].value }, { label: "Questions", value: numQuestions[0].value },
    { label: "Submissions", value: numSubmissions[0].value },
    { label: "Average Score", value: avgScore[0].value },
  ];

}

export default getUserMatrics;