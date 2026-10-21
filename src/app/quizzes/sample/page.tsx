import type { Metadata } from "next";
import { QuizPlayer, type PlayerQuiz } from "../quiz-player";

export const metadata: Metadata = { title: "Sample quiz" };

// A fixed quiz for trying the app without uploading a document. It is never saved.
const sampleQuiz: PlayerQuiz = {
  id: 0,
  name: "React basics",
  questions: [
    {
      id: 1,
      questionText: "What is your level of understanding React?",
      explanation: null,
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
      explanation:
        "React keeps a copy of the page in memory, compares it after each change and updates only the parts of the real DOM that differ.",
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
      explanation:
        "JSX lets you write HTML-like markup in JavaScript; a compiler turns it into calls that create React elements.",
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
  return <QuizPlayer quiz={sampleQuiz} exitHref="/" isSample />;
}
