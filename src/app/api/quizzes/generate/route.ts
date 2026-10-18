import { NextResponse } from "next/server";
import { pingDatabase } from "@/db/health";
import { errorResponse } from "@/lib/api-response";
import { extractPdfText, limitDocumentText, uploadFileName } from "@/lib/pdf";
import { isQuestionCountAllowed, questionCountUpgradeMessage } from "@/lib/plans";
import { pdfUploadSchema, quickQuizSchema } from "@/lib/validations/quiz";
import { GenerationError, generateQuiz } from "@/server/services/generation";
import { createQuiz } from "@/server/services/quizzes";
import { GenerationLimitError, getPlan, runGeneration } from "@/server/services/usage";
import { getCurrentUser } from "@/server/session";

// Gemini needs 10-20 s for a typical document; set explicitly so a lower platform default can't cut it off.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.formData();
    const upload = await pdfUploadSchema.safeParseAsync(body.get("pdf"));

    if (!upload.success) {
      return errorResponse(upload.error.issues[0].message, 400);
    }
    const document = upload.data;

    const quick = quickQuizSchema.safeParse({ questionCount: body.get("questionCount") });
    if (!quick.success) {
      return errorResponse(quick.error.issues[0].message, 400);
    }
    const { questionCount } = quick.data;

    // Checked before the slow model call so an outage doesn't waste a Gemini request.
    if (!(await pingDatabase())) {
      return errorResponse(
        "The database is currently unavailable. Please try again in a few minutes.",
        503,
      );
    }

    // After the database check: with the database down, every visitor looks signed out.
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Please sign in to generate a quiz.", 401);
    }

    if (!isQuestionCountAllowed(await getPlan(user.id), questionCount)) {
      return errorResponse(questionCountUpgradeMessage(questionCount), 403);
    }

    const { text, truncated } = limitDocumentText((await extractPdfText(document)).text);

    if (!text) {
      return errorResponse(
        "We couldn't find any text in this PDF. Scanned documents aren't supported yet.",
        422,
      );
    }

    // Reserved only after the cheap checks above, right before the call that costs money.
    try {
      const quizId = await runGeneration(user.id, async (onUsage) => {
        const quiz = await generateQuiz({
          documents: [{ title: uploadFileName(body.get("pdf")), text }],
          questionCount,
          onUsage,
        });
        return createQuiz(quiz, user.id);
      });
      return NextResponse.json({ quizId, truncated }, { status: 200 });
    } catch (error) {
      if (error instanceof GenerationLimitError || error instanceof GenerationError) {
        return errorResponse(error.message, error.status);
      }
      throw error;
    }
  } catch (error) {
    console.error("Quiz generation failed", error);
    return errorResponse("Something went wrong while generating your quiz. Please try again.", 500);
  }
}
