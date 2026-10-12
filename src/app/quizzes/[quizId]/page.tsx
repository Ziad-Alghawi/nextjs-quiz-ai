import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { quizIdSchema } from "@/lib/validations/quiz";
import { getQuizWithQuestions } from "@/server/services/quizzes";
import { requireUser } from "@/server/session";
import QuizQuestions from "../QuizQuestions";

type Props = { params: Promise<{ quizId: string }> };

// The title and the page both need the quiz; cache() runs the lookup once per request.
const loadQuiz = cache(async (quizId: string) => {
  const user = await requireUser(`/quizzes/${quizId}`);

  const id = quizIdSchema.safeParse(quizId);
  if (!id.success) notFound();

  // Someone else's quiz is a 404 as well, so quiz ids can't be probed.
  const quiz = await getQuizWithQuestions(id.data, user.id);
  if (!quiz || quiz.questions.length === 0) notFound();
  return quiz;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const quiz = await loadQuiz((await params).quizId);
  return { title: quiz.name };
}

const page = async ({ params }: Props) => {
  const quiz = await loadQuiz((await params).quizId);
  return <QuizQuestions quiz={quiz} />;
};
export default page;
