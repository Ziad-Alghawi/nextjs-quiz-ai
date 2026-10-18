import { z } from "zod";
import {
  MAX_CHAPTERS_PER_COURSE,
  MAX_QUESTIONS,
  MAX_REVIEW_QUIZZES,
  QUESTION_COUNTS,
} from "@/lib/plans";
import { chapterIdSchema, courseIdSchema } from "./course";

// Below Vercel's 4.5 MB request body limit, which rejects larger uploads before our code runs.
export const MAX_PDF_BYTES = 4 * 1024 * 1024;

// The browser-reported MIME type is client-controlled and sometimes empty, so check the file header.
const PDF_SIGNATURE = "%PDF-";

const hasPdfSignature = async (file: Blob) => {
  const header = await file.slice(0, PDF_SIGNATURE.length).arrayBuffer();
  return new TextDecoder().decode(header) === PDF_SIGNATURE;
};

export const pdfUploadSchema = z
  .instanceof(Blob, { message: "Please choose a PDF file." })
  .refine((file) => file.size > 0, "The selected file is empty.")
  .refine(
    (file) => file.size <= MAX_PDF_BYTES,
    "This PDF is larger than 4 MB. Please upload a smaller file.",
  )
  .refine(hasPdfSignature, "Only PDF files are supported.");

// A new schema per field: a shared instance becomes a JSON Schema $ref, which Gemini rejects.
const nonEmptyText = () =>
  z.string().refine((value) => value.trim().length > 0, "Must not be empty");

// Size limits are refinements instead of .min()/.max(): Gemini rejects array-length
// constraints in its response schema, while LangChain still runs every refinement.
export const generatedQuizSchema = z.object({
  name: nonEmptyText().describe("Short title of the quiz"),
  description: nonEmptyText().describe("One-sentence summary of what the quiz covers"),
  questions: z
    .array(
      z.object({
        questionText: nonEmptyText(),
        answers: z
          .array(z.object({ answerText: nonEmptyText(), isCorrect: z.boolean() }))
          .refine(
            (answers) => answers.length >= 2 && answers.length <= 6,
            "Each question needs 2 to 6 answers",
          )
          .refine(
            (answers) => answers.filter((answer) => answer.isCorrect).length === 1,
            "Each question needs exactly one correct answer",
          ),
        explanation: nonEmptyText().describe(
          "At most 2 sentences on why the correct answer is right, based on the document",
        ),
      }),
    )
    // Generous on purpose: questions beyond the requested count are dropped after generation,
    // instead of failing the whole quiz.
    .refine(
      (questions) => questions.length >= 1 && questions.length <= 2 * MAX_QUESTIONS,
      `A quiz needs 1 to ${2 * MAX_QUESTIONS} questions`,
    ),
});

// Some plan offers it; the caller checks the user's own plan on top.
const questionCountSchema = z
  .number()
  .refine((count) => QUESTION_COUNTS.includes(count), "Choose one of the offered question counts.");

/** Generating a quiz from chapters of one course. Repeated chapter ids count once. */
export const chapterQuizSchema = z.object({
  chapterIds: z
    .array(chapterIdSchema)
    .min(1, "Select at least one chapter.")
    .max(MAX_CHAPTERS_PER_COURSE, `Select at most ${MAX_CHAPTERS_PER_COURSE} chapters.`)
    .transform((ids) => [...new Set(ids)]),
  questionCount: questionCountSchema,
});

/** A quiz id from a URL or form: a positive whole number. */
export const quizIdSchema = z.coerce.number().int().positive();

/** A review quiz from 2 or more quizzes of one course, as the form sends it. Repeated ids count once. */
export const reviewQuizSchema = z.object({
  courseId: courseIdSchema,
  quizIds: z
    .array(quizIdSchema)
    .transform((ids) => [...new Set(ids)])
    .refine((ids) => ids.length >= 2, "Select at least two quizzes.")
    .refine(
      (ids) => ids.length <= MAX_REVIEW_QUIZZES,
      `Select at most ${MAX_REVIEW_QUIZZES} quizzes.`,
    ),
  questionCount: z.coerce.number().pipe(questionCountSchema),
});

export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;
