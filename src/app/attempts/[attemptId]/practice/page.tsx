import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadAttempt } from "@/app/attempts/load-attempt";
import { QuizPlayer } from "@/app/quizzes/quiz-player";
import { missedQuestions, shuffleRound } from "@/lib/practice";

type Props = { params: Promise<{ attemptId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { attemptId } = await params;
  const { quiz } = await loadAttempt(attemptId, `/attempts/${attemptId}/practice`);
  return { title: `Practice: ${quiz.name}` };
}

/** The attempt's missed questions in the quiz player; nothing is saved. */
export default async function PracticePage({ params }: Props) {
  const { attemptId } = await params;
  const { attempt, quiz, detailed } = await loadAttempt(
    attemptId,
    `/attempts/${attemptId}/practice`,
  );
  const reviewHref = `/attempts/${attempt.id}`;

  // Old attempts have no saved answers, and a perfect one has nothing to practise.
  const missed = detailed ? missedQuestions(quiz.questions, attempt.answers) : [];
  if (missed.length === 0) redirect(reviewHref);

  return (
    <QuizPlayer
      // Shuffled here, not in the browser, so the server and the browser render the same order.
      quiz={{ id: quiz.id, name: quiz.name, questions: shuffleRound(missed) }}
      exitHref={reviewHref}
      exitLabel="Back to review"
      practice
    />
  );
}
