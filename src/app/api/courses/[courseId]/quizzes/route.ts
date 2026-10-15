import { NextResponse } from "next/server";
import { shareDocumentBudget } from "@/lib/pdf";
import { PLANS } from "@/lib/plans";
import { courseIdSchema } from "@/lib/validations/course";
import { chapterQuizSchema } from "@/lib/validations/quiz";
import { GenerationError, generateQuiz } from "@/server/services/generation";
import { createQuiz } from "@/server/services/quizzes";
import { getChapterTexts } from "@/server/services/sources";
import { GenerationLimitError, getPlan, runGeneration } from "@/server/services/usage";
import { getCurrentUser } from "@/server/session";

// Gemini needs 10-20 s for a typical document; set explicitly so a lower platform default can't cut it off.
export const maxDuration = 60;

const errorResponse = (error: string, status: number) => NextResponse.json({ error }, { status });

const CHAPTERS_NOT_FOUND = "Some of these chapters don't exist anymore. Reload the page.";

/** Generates a quiz from chapters of one course and saves it in that course. */
export async function POST(
  request: Request,
  context: RouteContext<"/api/courses/[courseId]/quizzes">,
) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Please sign in to generate a quiz.", 401);

  const courseId = courseIdSchema.safeParse((await context.params).courseId);
  if (!courseId.success) return errorResponse(CHAPTERS_NOT_FOUND, 404);

  // A body that isn't JSON gets the same 400 as one that fails the schema.
  const body = chapterQuizSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return errorResponse(body.error.issues[0].message, 400);
  const { chapterIds, questionCount } = body.data;

  const plan = await getPlan(user.id);
  if (!PLANS[plan].questionCounts.some((count) => count === questionCount)) {
    return errorResponse(
      `Quizzes with ${questionCount} questions are part of Pro. Upgrade, or choose fewer questions.`,
      403,
    );
  }

  const chapters = await getChapterTexts(user.id, courseId.data, chapterIds);
  if (chapters.length !== chapterIds.length) return errorResponse(CHAPTERS_NOT_FOUND, 404);
  const { documents, truncated } = shareDocumentBudget(
    chapters.map(({ name, text }) => ({ title: name, text })),
  );

  try {
    const quizId = await runGeneration(user.id, async (onUsage) => {
      const quiz = await generateQuiz({ documents, questionCount, onUsage });
      return createQuiz(quiz, user.id, { courseId: courseId.data, chapterIds });
    });
    return NextResponse.json({ quizId, truncated }, { status: 201 });
  } catch (error) {
    if (error instanceof GenerationLimitError || error instanceof GenerationError) {
      return errorResponse(error.message, error.status);
    }
    throw error;
  }
}
