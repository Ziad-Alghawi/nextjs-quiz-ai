"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ProgressBar from "@/components/ui/progressBar";
import { ChevronLeft, X } from "lucide-react";
import ResultCard from "./ResultCard";
import QuizSubmission from "./QuizSubmission";
import { InferSelectModel } from "drizzle-orm";
import { questionAnswers, questions as Dbquestions, quizzes } from "@/db/schema";
import { useRouter } from "next/navigation";
import { submitQuiz } from "../actions/submitQuiz";
import { scoreAttempt, type SelectedAnswer } from "@/lib/scoring";

type Answer = InferSelectModel<typeof questionAnswers>;
type Question = InferSelectModel<typeof Dbquestions> & {
  answers: Answer[];
};
// Only the fields the player shows, so the static sample quiz fits without being a database row.
export type QuizWithQuestions = Pick<
  InferSelectModel<typeof quizzes>,
  "id" | "name" | "description"
> & {
  questions: Question[];
};

type props = {
  quiz: QuizWithQuestions;
  isSample?: boolean;
};

export default function QuizQuestions(props: props) {
  const { questions } = props.quiz;
  const [started, setStarted] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<SelectedAnswer[]>([]);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  const router = useRouter();

  const handleNext = () => {
    if (!started) {
      setStarted(true);
    } else if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleAnswer = (answer: Answer, questionId: number) => {
    setUserAnswers([...userAnswers, { questionId, answerId: answer.id }]);
  };

  const handleSubmit = async () => {
    const localResult = scoreAttempt(questions, userAnswers);
    // The sample quiz has no database row to attach a submission to.
    if (props.isSample) {
      setResult(localResult);
      return;
    }
    try {
      setResult(await submitQuiz({ quizId: props.quiz.id, answers: userAnswers }));
    } catch (e) {
      console.error("Error saving submission:", e);
      // Saving failed, but the user still sees how they did.
      setResult(localResult);
    }
  };

  const handlePressPrev = () => {
    if (currentQuestion !== 0) {
      setCurrentQuestion((prevCurrentQuestion) => prevCurrentQuestion - 1);
    }
  };

  const handleExit = () => {
    router.push(props.isSample ? "/" : "/dashboard");
  };

  const selectedAnswer: number | null | undefined = userAnswers.find(
    (item) => item.questionId === questions[currentQuestion].id,
  )?.answerId;
  const isCorrect =
    questions[currentQuestion].answers.findIndex((answer) => answer.id === selectedAnswer) !== -1
      ? questions[currentQuestion].answers.find((answer) => answer.id === selectedAnswer)?.isCorrect
      : null;

  if (result) {
    return (
      <QuizSubmission
        score={result.score}
        totalQuestions={result.total}
        scorePercentage={Math.round((result.score / result.total) * 100)}
      />
    );
  }

  const allAnswered = scoreAttempt(questions, userAnswers).complete;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="position-sticky top-0 z-10 w-full shrink-0 py-4 shadow-md">
        <header
          className="grid grid-cols-[auto_1fr_auto]
          grid-flow-col items-center justify-between py-2 gap-2"
        >
          <Button size="icon" variant="outline" onClick={handlePressPrev}>
            <ChevronLeft />
          </Button>

          <ProgressBar value={(currentQuestion / questions.length) * 100} />

          <Button size="icon" variant="outline" onClick={handleExit}>
            <X />
          </Button>
        </header>
      </div>
      <main className="flex flex-1 justify-center overflow-y-auto px-2">
        {!started ? (
          <h1 className="mt-10 text-center text-3xl font-bold">Welcome to the quiz page 👋</h1>
        ) : (
          <div className="w-full max-w-3xl py-2">
            <h2 className="text-3xl font-bold wrap-break-word">
              {questions[currentQuestion].questionText}
            </h2>
            <div className="grid grid-cols-1 gap-6 mt-6">
              {questions[currentQuestion].answers.map((answer) => {
                const variant =
                  selectedAnswer === answer.id
                    ? answer.isCorrect
                      ? "neoSuccess"
                      : "neoDanger"
                    : "neoOutline";

                return (
                  <Button
                    key={answer.id}
                    disabled={!!selectedAnswer}
                    variant={variant}
                    size="xl"
                    onClick={() => handleAnswer(answer, questions[currentQuestion].id)}
                    className="h-auto! min-h-16 px-5 py-4 text-left disabled:opacity-100"
                  >
                    <p className="w-full whitespace-normal wrap-break-word leading-relaxed">
                      {answer.answerText}
                    </p>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <footer className="footer relative mb-0 shrink-0 px-6 pb-4">
        <ResultCard
          isCorrect={isCorrect}
          correctAnswer={
            questions[currentQuestion].answers.find((answer) => answer.isCorrect === true)
              ?.answerText || ""
          }
        />
        {started && currentQuestion === questions.length - 1 ? (
          <Button variant="neo" size="lg" onClick={handleSubmit} disabled={!allAnswered}>
            submit
          </Button>
        ) : (
          <Button
            variant="neo"
            size="lg"
            onClick={handleNext}
            disabled={started && !selectedAnswer}
          >
            {!started ? "Start" : "Next"}
          </Button>
        )}
      </footer>
    </div>
  );
}
