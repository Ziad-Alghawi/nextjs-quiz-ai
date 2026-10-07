import { getQuizWithQuestions } from "@/server/services/quizzes";
import QuizzQuestions from "../QuizzQuestions";

const page = async ({
  params,
}: {
  params: Promise<{
    quizzId: string;
  }>;
}) => {
  const { quizzId } = await params;
  const quizz = await getQuizWithQuestions(parseInt(quizzId));

  if (!quizzId || !quizz || quizz.questions.length === 0) {
    return <div>Quizz not found</div>;
  }

  return <QuizzQuestions quizz={quizz} />;
};
export default page;
