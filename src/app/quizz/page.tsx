"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ProgressBar from "@/components/ui/progressBar";
import { ChevronLeft, X } from "lucide-react";
import ResultCard from "./ResultCard";
import QuizzSubmission from "./QuizzSubmission";

const questions = [
  {
    questionText: "What is your level of understanding React?",
    answers: [
      { answerText: "Beginner", isCorrect: true, id: 1 },
      { answerText: "Intermediate", isCorrect: false, id: 2 },
      { answerText: "Advanced", isCorrect: false, id: 3 },
      { answerText: "Expert", isCorrect: false, id: 4 },
    ],
  },
  {
    questionText: "What is the virtual DOM in React?",
    answers: [
      { answerText: "A representation of the real DOM", isCorrect: true, id: 1 },
      { answerText: "A new JavaScript framework", isCorrect: false, id: 2 },
      { answerText: "A type of database", isCorrect: false, id: 3 },
      { answerText: "A CSS library", isCorrect: false, id: 4 },
    ],
  },
  {
    questionText: "What is JSX in React?",
    answers: [
      { answerText: "A syntax extension for JavaScript", isCorrect: true, id: 1 },  
      { answerText: "A new programming language", isCorrect: false, id: 2 },
      { answerText: "A type of API", isCorrect: false, id: 3 },
      { answerText: "A CSS preprocessor", isCorrect: false, id: 4 },
    ],
  }
];
export default function Home() {
  const [started, setStarted] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setCorrect] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleNext = () => {
    if(!started) {
    setStarted(true);
    return;
    }
    if(currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }else {
      setSubmitted(true);
      return;
    }
    setSelectedAnswer(null);
    setCorrect(null);
  };

  const scorePercentage: number = Math.round((score / questions.length) * 100);

  const handleAnswer = (answer: any) => {
    setSelectedAnswer(answer.id);
    const isCurrentCorrect = answer.isCorrect;
    if(isCurrentCorrect) {
      setScore(score + 1);
    }
    setCorrect(isCurrentCorrect);
  }

    if(submitted) {
      return (
        <QuizzSubmission score={score}
         totalQuestions={questions.length}
        scorePercentage={scorePercentage} />
      )
    }

  return (
    <div className="flex flex-col flex-1">
      <div className="position-sticky top-0 z-10 shadow-md py-4 w-full">
        <header className="grid grid-cols-[auto,1fr,auto]
          grid-flow-col items-center justify-between py-2 gap-2">

          <Button size="icon"
           variant="outline"><ChevronLeft />
           </Button>

          <ProgressBar value={(currentQuestion / questions.length) * 100} />
           
           <Button size="icon"
           variant="outline"><X />
           </Button>
          
        </header>
      </div>
    <main className="flex justify-center flex-1">
      {!started ?
       <h1 className="text-3xl font-bold">Welcome to the quizz page 👋</h1> 
      :
       <div>
        <h2 className="text-3xl font-bold">
          {questions[currentQuestion].questionText}
        </h2>
        <div className="grid grid-cols-1 gap-6 mt-6">
          {
            questions[currentQuestion].answers.map(answer => {
              const variant = selectedAnswer === answer.id ? (answer.isCorrect ? "neoSuccess" : "neoDanger") : "neoOutline";
              
              return (
                <Button key={answer.id} variant={variant}
                  size="xl"
                 onClick={() => handleAnswer(answer)}>
                  <p className="whitespace-normal">{answer.answerText}</p>  
                </Button>
              )
            })
          }
        </div>
      </div>}
    </main>
    <footer className="footer pb-9 px-6 relative mb-0 ">
      <ResultCard isCorrect={isCorrect}
       correctAnswer={questions[currentQuestion].answers.find(answer => answer.isCorrect === true)?.answerText|| ""} />
      <Button variant="neo" size="lg" onClick={handleNext}>{!started ? 'Start' : (currentQuestion === questions.length -1) ? 'Submit' : 'Next'}</Button>
    </footer>
    </div>
  )
}