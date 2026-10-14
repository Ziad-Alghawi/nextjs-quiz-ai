import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/server/session";
import { pingDatabase } from "@/db/health";
import { extractPdfText, limitDocumentText } from "@/lib/pdf";
import { pdfUploadSchema, type GeneratedQuiz } from "@/lib/validations/quiz";
import { GenerationError, generateQuiz } from "@/server/services/generation";
import { createQuiz } from "@/server/services/quizzes";
import { finishGeneration, GenerationLimitError, reserveGeneration } from "@/server/services/usage";

// Gemini needs 10-20 s for a typical document; set explicitly so a lower platform default can't cut it off.
export const maxDuration = 60;

const errorResponse = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const upload = await pdfUploadSchema.safeParseAsync(body.get("pdf"));

    if (!upload.success) {
      return errorResponse(upload.error.issues[0].message, 400);
    }
    const document = upload.data;

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

    const { text, truncated } = limitDocumentText((await extractPdfText(document)).text);

    if (!text) {
      return errorResponse(
        "We couldn't find any text in this PDF. Scanned documents aren't supported yet.",
        422,
      );
    }

    // Reserved only after the cheap checks above, right before the call that costs money.
    let generationId: number;
    try {
      generationId = await reserveGeneration(user.id);
    } catch (error) {
      if (error instanceof GenerationLimitError) return errorResponse(error.message, error.status);
      throw error;
    }

    let succeeded = false;
    try {
      let quiz: GeneratedQuiz;
      try {
        quiz = await generateQuiz(text);
      } catch (error) {
        if (error instanceof GenerationError) return errorResponse(error.message, error.status);
        throw error;
      }
      const quizId = await createQuiz(quiz, user.id);
      succeeded = true;
      return NextResponse.json({ quizId, truncated }, { status: 200 });
    } finally {
      // Failed attempts don't use up the monthly quota.
      await finishGeneration(generationId, succeeded ? "succeeded" : "failed");
    }
  } catch (error) {
    console.error("Quiz generation failed", error);
    return errorResponse("Something went wrong while generating your quiz. Please try again.", 500);
  }
}
