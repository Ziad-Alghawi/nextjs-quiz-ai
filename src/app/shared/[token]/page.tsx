import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { shareTokenSchema } from "@/lib/validations/quiz";
import { getSharedQuiz } from "@/server/services/shares";
import { QuizPlayer } from "@/app/quizzes/quiz-player";

type Props = PageProps<"/shared/[token]">;

// The title and the page both need the quiz; cache() runs the lookup once per request.
const loadQuiz = cache(async (token: string) => {
  const parsed = shareTokenSchema.safeParse(token);
  // A link that was turned off is a 404 like one that never existed.
  const quiz = parsed.success ? await getSharedQuiz(parsed.data) : undefined;
  if (!quiz || quiz.questions.length === 0) notFound();
  return quiz;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const quiz = await loadQuiz((await params).token);
  // Only people with the link should find it, not search engines.
  return { title: quiz.name, robots: { index: false, follow: false } };
}

/** A quiz someone shared: anyone with the link can play it, without an account. */
export default async function SharedQuizPage({ params }: Props) {
  const { id, name, questions } = await loadQuiz((await params).token);
  // Only what the player needs: everything passed to a client component reaches the browser.
  return <QuizPlayer quiz={{ id, name, questions }} exitHref="/" unsaved />;
}
