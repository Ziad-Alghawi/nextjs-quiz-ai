import type { SelectedAnswer } from "./scoring";
import { shuffle } from "./shuffle";

type PracticeQuestion = { id: number; answers: { id: number; isCorrect: boolean }[] };

/** The questions answered wrong or not at all, in their original order. */
export function missedQuestions<Q extends PracticeQuestion>(
  questions: Q[],
  chosen: SelectedAnswer[],
) {
  // The first answer per question counts, as in scoreAttempt.
  const picked = new Map<number, number>();
  for (const { questionId, answerId } of chosen) {
    if (!picked.has(questionId)) picked.set(questionId, answerId);
  }
  return questions.filter(
    (question) =>
      !question.answers.some((answer) => answer.isCorrect && answer.id === picked.get(question.id)),
  );
}

/**
 * The questions in a new random order, each with its options shuffled too, so a practice round
 * can't be answered from remembered positions.
 */
export function shuffleRound<A, Q extends { answers: A[] }>(questions: Q[]) {
  return shuffle(questions).map((question) => ({
    ...question,
    answers: shuffle(question.answers),
  }));
}
