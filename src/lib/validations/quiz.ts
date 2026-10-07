import { z } from "zod";

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
  .refine((file) => file.size <= MAX_PDF_BYTES, "This PDF is larger than 4 MB. Please upload a smaller file.")
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
      }),
    )
    .refine(
      (questions) => questions.length >= 1 && questions.length <= 30,
      "A quiz needs 1 to 30 questions",
    ),
});

export type GeneratedQuiz = z.infer<typeof generatedQuizSchema>;
