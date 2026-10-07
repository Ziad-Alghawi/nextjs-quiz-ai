import { getQuizWithQuestions } from "@/server/services/quizzes";
import QuizQuestions from "../QuizQuestions";

const page = async ({
  params,
}: {
  params: Promise<{
    quizId: string;
  }>;
}) => {
  const { quizId } = await params;
  const quiz = await getQuizWithQuestions(parseInt(quizId));

  if (!quizId || !quiz || quiz.questions.length === 0) {
    return <div>Quiz not found</div>;
  }

  return <QuizQuestions quiz={quiz} />;
};
export default page;
