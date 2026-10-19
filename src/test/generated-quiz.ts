import type { GeneratedQuiz } from "@/lib/validations/quiz";

/**
 * A quiz as the AI returns it: questions "<name> 1?", "<name> 2?", ..., each with an explanation
 * and the answers "Right", "Wrong 1", "Wrong 2" and "Wrong 3".
 */
export function generatedQuiz(questionCount: number, name = "Cells"): GeneratedQuiz {
  return {
    name,
    description: `About ${name}.`,
    questions: Array.from({ length: questionCount }, (_, i) => ({
      questionText: `${name} ${i + 1}?`,
      explanation: `Explanation ${i + 1}.`,
      answers: [
        { answerText: "Right", isCorrect: true },
        { answerText: "Wrong 1", isCorrect: false },
        { answerText: "Wrong 2", isCorrect: false },
        { answerText: "Wrong 3", isCorrect: false },
      ],
    })),
  };
}
