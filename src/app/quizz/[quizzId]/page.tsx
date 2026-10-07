import { getQuizWithQuestions } from "@/server/services/quizzes";
import QuizQuestions from "../QuizQuestions";

const page = async ({
  params,
}: {
  params: Promise<{
    quizzId: string;
  }>;
}) => {
  const { quizzId } = await params;
  const quiz = await getQuizWithQuestions(parseInt(quizzId));

  if (!quizzId || !quiz || quiz.questions.length === 0) {
    return <div>Quizz not found</div>;
  }

  return <QuizQuestions quiz={quiz} />;
};
export default page;
