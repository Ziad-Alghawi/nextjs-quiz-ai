import { NextRequest, NextResponse } from "next/server";

import { ChatGoogle } from "@langchain/google/node";
import { HumanMessage } from "@langchain/core/messages";
import { auth } from "@/auth";
import { pingDatabase } from "@/db/health";
import { env } from "@/lib/env";
import { getQuotaErrorMessage } from "@/lib/gemini-errors";
import { extractPdfText } from "@/lib/pdf";
import { generatedQuizSchema, pdfUploadSchema, type GeneratedQuiz } from "@/lib/validations/quiz";
import { createQuiz } from "@/server/services/quizzes";

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

    const session = await auth();
    const userId = session?.user?.id;

    const text = await extractPdfText(document);

    if (!text) {
      return errorResponse(
        "We couldn't find any text in this PDF. Scanned documents aren't supported yet.",
        422,
      );
    }

    const prompt =
      "Generate a multiple-choice quiz about the following document. Give it a short name and a one-sentence description. Each question must have exactly one correct answer.";

    const model = new ChatGoogle({
      apiKey: env.GEMINI_API_KEY,
      model: "gemini-2.5-flash",
    }).withStructuredOutput(generatedQuizSchema);

    let quiz: GeneratedQuiz;
    try {
      quiz = await model.invoke([new HumanMessage(prompt + "\n\n" + text)]);
    } catch (error) {
      console.error("Quiz generation: model call failed", error);
      const quotaMessage = getQuotaErrorMessage(error);
      return quotaMessage
        ? errorResponse(quotaMessage, 503)
        : errorResponse(
            "The AI could not generate a valid quiz from this document. Please try again.",
            502,
          );
    }

    const quizzId = await createQuiz(quiz, userId);

    return NextResponse.json({ quizzId }, { status: 200 });
  } catch (error) {
    console.error("Quiz generation failed", error);
    return errorResponse("Something went wrong while generating your quiz. Please try again.", 500);
  }
}
