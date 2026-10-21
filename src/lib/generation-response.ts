import { z } from "zod";

const successSchema = z.object({ quizId: z.number(), truncated: z.boolean() });
const errorSchema = z.object({ error: z.string() });

export type GenerationResult = { href: string } | { error: string };

export const PDF_TOO_LARGE = "This PDF is too large to upload.";

// Responses that never reached our route (e.g. Vercel's 413 or 504 pages) are not JSON.
function fallbackMessage(status: number) {
  if (status === 413) return PDF_TOO_LARGE;
  if (status === 504) return "Generating the quiz took too long. Please try a shorter document.";
  return "Something went wrong while generating your quiz. Please try again.";
}

/** Turns the response of a quiz-generation route into the quiz page to open or a message to show. */
export async function readGenerationResponse(response: Response): Promise<GenerationResult> {
  const body: unknown = await response.json().catch(() => null);
  const success = successSchema.safeParse(body);
  if (response.ok && success.success) {
    const { quizId, truncated } = success.data;
    return { href: `/quizzes/${quizId}${truncated ? "?notice=truncated" : ""}` };
  }
  const failure = errorSchema.safeParse(body);
  return { error: failure.success ? failure.data.error : fallbackMessage(response.status) };
}

export const NETWORK_ERROR = "Could not reach the server. Check your connection and try again.";
