import { NextRequest, NextResponse } from "next/server";

import { ChatGoogle } from "@langchain/google/node";
import { HumanMessage } from "@langchain/core/messages";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import saveQuizz from "./saveToDb";
import { auth } from "@/auth";
import { pingDatabase } from "@/db/health";

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

    const prompt = "given the text which is a summary of the document, generate a quiz based on the text. Return json only that contains a quizz object with fields: name, description and questions. The questions is an array of objects with fields: questionText, answers. The answers is an array of objects with fields: answerText, isCorrect.";

    const model = new ChatGoogle({
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-2.5-flash",
    });

    let result;
    try {
      result = await model.invoke([
        new HumanMessage(prompt + "\n" + texts.join("\n")),
      ]);
    } catch (error) {
      console.error("Quiz generation: model call failed", error);
      return isRateLimitError(error)
        ? errorResponse("The AI service is at its usage limit right now. Please try again in a minute.", 503)
        : errorResponse("The AI service could not generate a quiz. Please try again.", 502);
    }

    const cleaned = result.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    if (!parsed?.quizz) {
      return errorResponse("The AI returned an invalid quiz. Please try again.", 502);
    }

    const { quizzId } = await saveQuizz(parsed.quizz, userId);

    return NextResponse.json({ quizzId }, { status: 200 });
  } catch (error) {
    console.error("Quiz generation failed", error);
    return errorResponse("Something went wrong while generating your quiz. Please try again.", 500);
  }
}
