"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/lib/form-state";
import { EXAM_BURST_LIMIT } from "@/lib/plans";
import { examSchema } from "@/lib/validations/quiz";
import { createExamQuiz } from "@/server/services/quizzes";
import { requireUser } from "@/server/session";

type ExamError = Extract<Awaited<ReturnType<typeof createExamQuiz>>, { error: string }>;

function errorMessage(result: ExamError) {
  switch (result.error) {
    case "not-found":
      return "This course doesn't exist anymore. Reload the page.";
    case "too-few":
      return result.available === 0
        ? "Make a quiz in this course first."
        : `This course's quizzes have only ${result.available} questions together. Choose fewer questions.`;
    case "rate-limit": {
      const { exams, windowMinutes } = EXAM_BURST_LIMIT;
      return `You can start ${exams} exams every ${windowMinutes} minutes. Please try again in a few minutes.`;
    }
  }
}

/** Makes a course exam and opens it; the form only ever sees an error. */
export async function createExam(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard");

  const parsed = examSchema.safeParse({
    courseId: formData.get("courseId"),
    questionCount: formData.get("questionCount"),
  });
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };

  const result = await createExamQuiz(user.id, parsed.data);
  if ("error" in result) return { status: "error", error: errorMessage(result) };

  // The course page lists the new exam.
  revalidatePath(`/courses/${parsed.data.courseId}`);
  redirect(`/quizzes/${result.quizId}`);
}
