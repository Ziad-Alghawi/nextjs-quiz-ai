import type { QuizWithQuestions } from "@/server/services/quizzes";
import QuizQuestions from "../QuizQuestions";

// A fixed quiz for trying the app without uploading a document. It is never saved.
const sampleQuiz: QuizWithQuestions = {
  id: 0,
  name: "React basics",
  description: "A short sample quiz about React.",
  questions: [
    {
      id: 1,
      questionText: "What is your level of understanding React?",
      answers: [
        { id: 1, answerText: "Beginner", isCorrect: true },
        { id: 2, answerText: "Intermediate", isCorrect: false },
        { id: 3, answerText: "Advanced", isCorrect: false },
        { id: 4, answerText: "Expert", isCorrect: false },
      ],
    },
    {
      id: 2,
      questionText: "What is the virtual DOM in React?",
      answers: [
        { id: 5, answerText: "A representation of the real DOM", isCorrect: true },
        { id: 6, answerText: "A new JavaScript framework", isCorrect: false },
        { id: 7, answerText: "A type of database", isCorrect: false },
        { id: 8, answerText: "A CSS library", isCorrect: false },
      ],
    },
    {
      id: 3,
      questionText: "What is JSX in React?",
      answers: [
        { id: 9, answerText: "A syntax extension for JavaScript", isCorrect: true },
        { id: 10, answerText: "A new programming language", isCorrect: false },
        { id: 11, answerText: "A type of API", isCorrect: false },
        { id: 12, answerText: "A CSS preprocessor", isCorrect: false },
      ],
    },
  ],
};

export default function SampleQuizPage() {
  return <QuizQuestions quiz={sampleQuiz} isSample />;
}
