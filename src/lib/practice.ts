import { firstAnswers, type SelectedAnswer } from "./scoring";
import { shuffle } from "./shuffle";

type PracticeQuestion = { id: number; answers: { id: number; isCorrect: boolean }[] };

/** The questions answered wrong or not at all, in their original order. */
export function missedQuestions<Q extends PracticeQuestion>(
  questions: Q[],
  chosen: SelectedAnswer[],
) {
  const picked = firstAnswers(chosen);
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
