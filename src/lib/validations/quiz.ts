import { z } from "zod";

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
