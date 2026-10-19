export type SelectedAnswer = { questionId: number; answerId: number };

type ScorableQuestion = { id: number; answers: { id: number; isCorrect: boolean }[] };

/**
 * Scores an attempt. Only the first answer given per question counts, and answer ids that don't
 * belong to that question are ignored, so a crafted request can't earn extra points. `answers` are
 * the answers that count, in question order.
 */
export function scoreAttempt(questions: ScorableQuestion[], selected: SelectedAnswer[]) {
  const chosen = new Map<number, number>();
  for (const { questionId, answerId } of selected) {
    if (!chosen.has(questionId)) chosen.set(questionId, answerId);
  }

  const answered = questions.flatMap((question) => {
    const answer = question.answers.find((option) => option.id === chosen.get(question.id));
    return answer
      ? [{ questionId: question.id, answerId: answer.id, isCorrect: answer.isCorrect }]
      : [];
  });

  return {
    score: answered.filter((answer) => answer.isCorrect).length,
    total: questions.length,
    complete: answered.length === questions.length,
    answers: answered.map(({ questionId, answerId }) => ({ questionId, answerId })),
  };
}
