import QuizQuestions, { type QuizWithQuestions } from "../QuizQuestions";

// A fixed quiz for trying the app without uploading a document. It is never saved.
const sampleQuiz: QuizWithQuestions = {
  id: 0,
  name: "React basics",
  description: "A short sample quiz about React.",
  questions: [
    {
      id: 1,
      quizId: 0,
      questionText: "What is your level of understanding React?",
      answers: [
        { id: 1, questionId: 1, answerText: "Beginner", isCorrect: true },
        { id: 2, questionId: 1, answerText: "Intermediate", isCorrect: false },
        { id: 3, questionId: 1, answerText: "Advanced", isCorrect: false },
        { id: 4, questionId: 1, answerText: "Expert", isCorrect: false },
      ],
    },
    {
      id: 2,
      quizId: 0,
      questionText: "What is the virtual DOM in React?",
      answers: [
        { id: 5, questionId: 2, answerText: "A representation of the real DOM", isCorrect: true },
        { id: 6, questionId: 2, answerText: "A new JavaScript framework", isCorrect: false },
        { id: 7, questionId: 2, answerText: "A type of database", isCorrect: false },
        { id: 8, questionId: 2, answerText: "A CSS library", isCorrect: false },
      ],
    },
    {
      id: 3,
      quizId: 0,
      questionText: "What is JSX in React?",
      answers: [
        { id: 9, questionId: 3, answerText: "A syntax extension for JavaScript", isCorrect: true },
        { id: 10, questionId: 3, answerText: "A new programming language", isCorrect: false },
        { id: 11, questionId: 3, answerText: "A type of API", isCorrect: false },
        { id: 12, questionId: 3, answerText: "A CSS preprocessor", isCorrect: false },
      ],
    },
  ],
};

export default function SampleQuizPage() {
  return <QuizQuestions quiz={sampleQuiz} isSample />;
}
