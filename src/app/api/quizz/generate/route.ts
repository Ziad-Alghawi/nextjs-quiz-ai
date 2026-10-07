import { NextRequest, NextResponse } from "next/server";

import { ChatGoogle } from "@langchain/google/node";
import { HumanMessage } from "@langchain/core/messages";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import saveQuizz from "./saveToDb";
import { auth } from "@/auth";
import { pingDatabase } from "@/db/health";
import { generatedQuizSchema, type GeneratedQuiz } from "@/lib/validations/quiz";

const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

// Gemini reports exhausted quotas and rate limits as HTTP 429.
const isRateLimitError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "statusCode" in error &&
  error.statusCode === 429;

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const document = body.get("pdf");

    if (!(document instanceof Blob) || document.size === 0) {
      return errorResponse("Please upload a valid PDF file", 400);
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("Quiz generation: GEMINI_API_KEY is not set");
      return errorResponse("Quiz generation is not configured on this server.", 500);
    }

    // Checked before the slow model call so an outage doesn't waste a Gemini request.
    if (!(await pingDatabase())) {
      return errorResponse(
        "The database is currently unavailable. Please try again in a few minutes.",
        503,
      );
    }

    const session = await auth();
    const userId = session?.user?.id;

    const pdfLoader = new PDFLoader(document, {
      parsedItemSeparator: "",
    });
    const docs = await pdfLoader.load();

    const selectedDocuments = docs.filter((doc) => doc.pageContent !== undefined);
    const texts = selectedDocuments.map((doc) => doc.pageContent);

    const prompt = "Generate a multiple-choice quiz about the following document. Give it a short name and a one-sentence description. Each question must have exactly one correct answer.";

    const model = new ChatGoogle({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-2.5-flash",
    }).withStructuredOutput(generatedQuizSchema);

    let quiz: GeneratedQuiz;
    try {
      quiz = await model.invoke([
        new HumanMessage(prompt + "\n\n" + texts.join("\n")),
      ]);
    } catch (error) {
      console.error("Quiz generation: model call failed", error);
      return isRateLimitError(error)
        ? errorResponse("The AI service is at its usage limit right now. Please try again in a minute.", 503)
        : errorResponse("The AI could not generate a valid quiz from this document. Please try again.", 502);
    }

    const { quizzId } = await saveQuizz(quiz, userId);

    return NextResponse.json({ quizzId }, { status: 200 });
  } catch (error) {
    console.error("Quiz generation failed", error);
    return errorResponse("Something went wrong while generating your quiz. Please try again.", 500);
  }
}
