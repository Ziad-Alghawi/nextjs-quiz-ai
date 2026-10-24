import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { examPaper } from "@/lib/exam";
import { quizIdSchema } from "@/lib/validations/quiz";
import { getQuizWithQuestions } from "@/server/services/quizzes";
import { requireUser } from "@/server/session";
import { ExamPlayer } from "../exam-player";
import { QuizPlayer } from "../quiz-player";

type Props = PageProps<"/quizzes/[quizId]">;

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

export default async function QuizPage({ params, searchParams }: Props) {
  const quiz = await loadQuiz((await params).quizId);
  const exitHref = `/courses/${quiz.courseId}`;
  // Everything passed to a client component is sent to the browser, so an exam gets only its paper.
  if (quiz.kind === "exam") return <ExamPlayer exam={examPaper(quiz)} exitHref={exitHref} />;

  // Set by the upload form when the document was longer than the text limit.
  const { notice } = await searchParams;

  return <QuizPlayer quiz={quiz} exitHref={exitHref} truncated={notice === "truncated"} />;
}
