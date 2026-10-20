type ExamSource = {
  id: number;
  name: string;
  questions: { id: number; questionText: string; answers: { id: number; answerText: string }[] }[];
};

/**
 * The exam as the browser gets it: questions and options without which one is correct or why.
 * Every field is picked by name instead of spread, so a column added to the quiz query later can't
 * reach the browser before the exam is submitted.
 */
export function examPaper(quiz: ExamSource) {
  return {
    id: quiz.id,
    name: quiz.name,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      questionText: question.questionText,
      answers: question.answers.map((answer) => ({ id: answer.id, answerText: answer.answerText })),
    })),
  };
}
