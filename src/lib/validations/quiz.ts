import { z } from "zod";
import {
  EXAM_QUESTION_COUNTS,
  MAX_CHAPTERS_PER_COURSE,
  MAX_PDF_BYTES,
  MAX_PDF_MB,
  MAX_QUESTIONS,
  MAX_REVIEW_QUIZZES,
  QUESTION_COUNTS,
} from "@/lib/plans";
import { chapterIdSchema, courseIdSchema } from "./course";
import { idSchema } from "./id";

// The browser-reported MIME type is client-controlled and sometimes empty, so check the file header.
const PDF_SIGNATURE = "%PDF-";

const hasPdfSignature = async (file: Blob) => {
  const header = await file.slice(0, PDF_SIGNATURE.length).arrayBuffer();
  return new TextDecoder().decode(header) === PDF_SIGNATURE;
};

export const pdfUploadSchema = z
  .instanceof(Blob, { error: "Please choose a PDF file." })
  .refine((file) => file.size > 0, "The selected file is empty.")
  .refine(
    (file) => file.size <= MAX_PDF_BYTES,
    `This PDF is larger than ${MAX_PDF_MB} MB. Please upload a smaller file.`,
  )
  .refine(hasPdfSignature, "Only PDF files are supported.");

// A new schema per field: a shared instance becomes a JSON Schema $ref, which Gemini rejects.
const nonEmptyText = () =>
  z.string().refine((value) => value.trim().length > 0, "Must not be empty");

// Size limits are refinements instead of .min()/.max(): Gemini rejects array-length
// constraints in its response schema, while LangChain still runs every refinement.
// Generous on purpose: questions beyond the requested count are dropped after generation, instead
// of failing the whole quiz.
export const MAX_GENERATED_QUESTIONS = 2 * MAX_QUESTIONS;

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
    .refine(
      (questions) => questions.length >= 1 && questions.length <= MAX_GENERATED_QUESTIONS,
      `A quiz needs 1 to ${MAX_GENERATED_QUESTIONS} questions`,
    ),
});

// Some plan offers it; the caller checks the user's own plan on top.
const questionCountSchema = z
  .number()
  .refine((count) => QUESTION_COUNTS.includes(count), "Choose one of the offered question counts.");

/** A question count as a form sends it (a string). */
const formQuestionCount = z.coerce.number().pipe(questionCountSchema);

/** Generating a quiz from one uploaded PDF; the PDF itself is validated by `pdfUploadSchema`. */
export const quickQuizSchema = z.object({ questionCount: formQuestionCount });

/** Generating a quiz from chapters of one course. Repeated chapter ids count once. */
export const chapterQuizSchema = z.object({
  chapterIds: z
    .array(chapterIdSchema)
    .min(1, "Select at least one chapter.")
    .max(MAX_CHAPTERS_PER_COURSE, `Select at most ${MAX_CHAPTERS_PER_COURSE} chapters.`)
    .transform((ids) => [...new Set(ids)]),
  questionCount: questionCountSchema,
});

export const quizIdSchema = idSchema;
export const attemptIdSchema = idSchema;

/** The token in a shared quiz's link: 24 random bytes in base64url (see services/shares.ts). */
export const shareTokenSchema = z.string().regex(/^[\w-]{32}$/);

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
  questionCount: formQuestionCount,
});

/** A course exam as the form sends it; every plan offers every exam count. */
export const examSchema = z.object({
  courseId: courseIdSchema,
  questionCount: z.coerce
    .number()
    .refine(
      (count) => EXAM_QUESTION_COUNTS.includes(count),
      "Choose one of the offered question counts.",
    ),
});

export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;
