"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/actions/account";
import { REVIEW_BURST_LIMIT } from "@/lib/plans";
import { reviewQuizSchema } from "@/lib/validations/quiz";
import { createReviewQuiz } from "@/server/services/quizzes";
import { requireUser } from "@/server/session";

type ReviewError = Extract<Awaited<ReturnType<typeof createReviewQuiz>>, { error: string }>;

function errorMessage(result: ReviewError, questionCount: number) {
  switch (result.error) {
    case "not-found":
      return "Some of these quizzes don't exist anymore. Reload the page.";
    case "plan":
      return `Quizzes with ${questionCount} questions are part of Pro. Upgrade, or choose fewer questions.`;
    case "too-few":
      return `These quizzes have only ${result.available} questions together. Choose fewer questions.`;
    case "rate-limit": {
      const { reviews, windowMinutes } = REVIEW_BURST_LIMIT;
      return `You can make ${reviews} reviews every ${windowMinutes} minutes. Please try again in a few minutes.`;
    }
  }
}

/** Makes a review quiz from quizzes of one course and opens it; the form only ever sees an error. */
export async function createReview(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard");

  const parsed = reviewQuizSchema.safeParse({
    courseId: formData.get("courseId"),
    quizIds: formData.getAll("quizIds"),
    questionCount: formData.get("questionCount"),
  });
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  const { courseId, questionCount } = parsed.data;

  const result = await createReviewQuiz(user.id, parsed.data);
  if ("error" in result) return { status: "error", error: errorMessage(result, questionCount) };

  // The course page lists the new quiz.
  revalidatePath(`/courses/${courseId}`);
  redirect(`/quizzes/${result.quizId}`);
}
