export type SelectedAnswer = { questionId: number; answerId: number };

type ScorableQuestion = { id: number; answers: { id: number; isCorrect: boolean }[] };

/**
 * Scores an attempt. Only the first answer given per question counts, and answer ids that don't
 * belong to that question are ignored, so a crafted request can't earn extra points.
 */
export function scoreAttempt(questions: ScorableQuestion[], selected: SelectedAnswer[]) {
  const chosen = new Map<number, number>();
  for (const { questionId, answerId } of selected) {
    if (!chosen.has(questionId)) chosen.set(questionId, answerId);
  }

  const answerFor = (question: ScorableQuestion) =>
    question.answers.find((answer) => answer.id === chosen.get(question.id));

  return {
    score: questions.filter((question) => answerFor(question)?.isCorrect).length,
    total: questions.length,
    complete: questions.every((question) => answerFor(question) !== undefined),
  };
}
