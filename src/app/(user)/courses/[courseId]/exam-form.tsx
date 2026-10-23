"use client";
import { useActionState, useState } from "react";
import { createExam } from "@/app/actions/exams";
import { QuestionCountPicker } from "@/components/question-count-picker";
import { FormError } from "@/components/ui/form-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { IDLE, type FormState } from "@/lib/form-state";
import { DEFAULT_QUESTION_COUNT, EXAM_QUESTION_COUNTS } from "@/lib/plans";

const SMALLEST_EXAM = Math.min(...EXAM_QUESTION_COUNTS);

type ExamFormProps = {
  courseId: number;
  /** How many questions the course's quizzes have together. */
  available: number;
};

/** Starts an exam with questions from all quizzes of the course, without AI. */
export function ExamForm({ courseId, available }: ExamFormProps) {
  const [state, action, pending] = useActionState<FormState, FormData>(createExam, IDLE);
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTION_COUNT);

  const hint =
    available < SMALLEST_EXAM
      ? `An exam needs at least ${SMALLEST_EXAM} questions; this course's quizzes have ${available}.`
      : questionCount > available
        ? `This course's quizzes have only ${available} questions together. Choose fewer questions.`
        : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Questions from all quizzes of this course, with no feedback until you finish. It
        doesn&apos;t use your monthly quizzes.
      </p>
      <input type="hidden" name="courseId" value={courseId} />

      <QuestionCountPicker
        counts={EXAM_QUESTION_COUNTS}
        value={questionCount}
        onChange={setQuestionCount}
        disabled={pending}
        max={available}
      />

      <FormError>{state.status === "error" ? state.error : undefined}</FormError>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}

      <div>
        <SubmitButton variant="outline" disabled={hint !== null} pendingText="Starting…">
          Start exam
        </SubmitButton>
      </div>
    </form>
  );
}
