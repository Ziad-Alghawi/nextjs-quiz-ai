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
import { saveSubmissions } from "../actions/saveSubmissions";

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
  const [score, setScore] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<{ questionId: number; answerId: number }[]>([]);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const router = useRouter();

  const handleNext = () => {
    if (!started) {
      setStarted(true);
      return;
    }
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setSubmitted(true);
      return;
    }
  };

  const handleAnswer = (answer: Answer, questionId: number) => {
    const newUserAnswersArr = [
      ...userAnswers,
      {
        questionId,
        answerId: answer.id,
      },
    ];
    setUserAnswers(newUserAnswersArr);

    const isCurrentCorrect = answer.isCorrect;
    if (isCurrentCorrect) {
      setScore(score + 1);
    }
  };

  const handleSubmit = async () => {
    // The sample quiz has no database row to attach a submission to.
    if (!props.isSample) {
      try {
        await saveSubmissions({ score }, props.quiz.id);
      } catch (e) {
        console.error("Error saving submission:", e);
      }
    }
    setSubmitted(true);
  };

  const handlePressPrev = () => {
    if (currentQuestion !== 0) {
      setCurrentQuestion((prevCurrentQuestion) => prevCurrentQuestion - 1);
    }
  };

  const handleExit = () => {
    router.push(props.isSample ? "/" : "/dashboard");
  };

  const scorePercentage: number = Math.round((score / questions.length) * 100);
  const selectedAnswer: number | null | undefined = userAnswers.find(
    (item) => item.questionId === questions[currentQuestion].id,
  )?.answerId;
  const isCorrect =
    questions[currentQuestion].answers.findIndex((answer) => answer.id === selectedAnswer) !== -1
      ? questions[currentQuestion].answers.find((answer) => answer.id === selectedAnswer)?.isCorrect
      : null;

  if (submitted) {
    return (
      <QuizSubmission
        score={score}
        totalQuestions={questions.length}
        scorePercentage={scorePercentage}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="position-sticky top-0 z-10 w-full shrink-0 py-4 shadow-md">
        <header
          className="grid grid-cols-[auto,1fr,auto]
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
            <h2 className="text-3xl font-bold break-words">
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
                    className="!h-auto min-h-16 px-5 py-4 text-left disabled:opacity-100"
                  >
                    <p className="w-full whitespace-normal break-words leading-relaxed">
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
        {currentQuestion === questions.length - 1 ? (
          <Button variant="neo" size="lg" onClick={handleSubmit}>
            submit
          </Button>
        ) : (
          <Button variant="neo" size="lg" onClick={handleNext}>
            {!started ? "Start" : "Next"}
          </Button>
        )}
      </footer>
    </div>
  );
}
