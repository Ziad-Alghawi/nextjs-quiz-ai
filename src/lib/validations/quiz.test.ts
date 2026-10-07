import { describe, expect, it } from "vitest";
import {
  generatedQuizSchema,
  MAX_PDF_BYTES,
  pdfUploadSchema,
  quizIdSchema,
  type GeneratedQuiz,
} from "./quiz";

const answers = (correctCount: number, total = 4) =>
  Array.from({ length: total }, (_, i) => ({
    answerText: `Answer ${i + 1}`,
    isCorrect: i < correctCount,
  }));

const quizWith = (questions: GeneratedQuiz["questions"]): GeneratedQuiz => ({
  name: "Photosynthesis",
  description: "How plants turn light into energy.",
  questions,
});

const question = (answerList = answers(1)) => ({
  questionText: "What do plants produce?",
  answers: answerList,
});

describe("generatedQuizSchema", () => {
  it("accepts a quiz where every question has exactly one correct answer", () => {
    expect(generatedQuizSchema.safeParse(quizWith([question(), question()])).success).toBe(true);
  });

  it.each([
    ["no correct answer", answers(0)],
    ["two correct answers", answers(2)],
    ["a single answer", answers(1, 1)],
    ["seven answers", answers(1, 7)],
  ])("rejects a question with %s", (_, answerList) => {
    expect(generatedQuizSchema.safeParse(quizWith([question(answerList)])).success).toBe(false);
  });

  it("rejects a quiz without questions", () => {
    expect(generatedQuizSchema.safeParse(quizWith([])).success).toBe(false);
  });

  it("rejects a quiz with more than 30 questions", () => {
    const questions = Array.from({ length: 31 }, () => question());
    expect(generatedQuizSchema.safeParse(quizWith(questions)).success).toBe(false);
  });

  it("rejects whitespace-only text", () => {
    const blankQuestion = { ...question(), questionText: "   " };
    expect(generatedQuizSchema.safeParse(quizWith([blankQuestion])).success).toBe(false);
  });
});

describe("pdfUploadSchema", () => {
  const pdf = (body: BlobPart) => new Blob(["%PDF-1.4\n", body], { type: "application/pdf" });
  const firstError = async (input: unknown) => {
    const result = await pdfUploadSchema.safeParseAsync(input);
    return result.success ? null : result.error.issues[0].message;
  };

  it("accepts a PDF below the size limit", async () => {
    expect(await firstError(pdf("content"))).toBeNull();
  });

  it("rejects a missing file", async () => {
    expect(await firstError(null)).toBe("Please choose a PDF file.");
  });

  it("rejects an empty file", async () => {
    expect(await firstError(new Blob([]))).toBe("The selected file is empty.");
  });

  it("rejects a file larger than 4 MB", async () => {
    expect(await firstError(pdf(new Uint8Array(MAX_PDF_BYTES)))).toMatch(/larger than 4 MB/);
  });

  it("rejects a file without a PDF header, whatever its MIME type", async () => {
    const renamedText = new Blob(["just some notes"], { type: "application/pdf" });
    expect(await firstError(renamedText)).toBe("Only PDF files are supported.");
  });
});

describe("quizIdSchema", () => {
  it("accepts a positive integer from a URL segment", () => {
    expect(quizIdSchema.parse("42")).toBe(42);
  });

  it.each(["abc", "12abc", "0", "-3", "1.5", ""])("rejects %j", (input) => {
    expect(quizIdSchema.safeParse(input).success).toBe(false);
  });
});
