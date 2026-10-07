import { notFound } from "next/navigation";
import { quizIdSchema } from "@/lib/validations/quiz";
import { getQuizWithQuestions } from "@/server/services/quizzes";
import { requireUser } from "@/server/session";
import QuizQuestions from "../QuizQuestions";

const page = async ({ params }: { params: Promise<{ quizId: string }> }) => {
  const { quizId } = await params;
  const user = await requireUser(`/quizzes/${quizId}`);

  const id = quizIdSchema.safeParse(quizId);
  if (!id.success) notFound();

  // Someone else's quiz is a 404 as well, so quiz ids can't be probed.
  const quiz = await getQuizWithQuestions(id.data, user.id);
  if (!quiz || quiz.questions.length === 0) notFound();

  return <QuizQuestions quiz={quiz} />;
};
export default page;
