/** Plan limits. The server enforces them; the UI only displays them. */
export const PLANS = {
  free: { label: "Free", monthlyQuizzes: 10 },
  pro: { label: "Pro", monthlyQuizzes: 50 },
} as const;

export type PlanId = keyof typeof PLANS;

/** On every plan: at most this many generation attempts per user in the window. */
export const GENERATION_BURST_LIMIT = { attempts: 3, windowMinutes: 10 } as const;

/**
 * Document text sent to Gemini, in characters: about 40k tokens (4 characters per token in English,
 * fewer in other languages). Bounds the cost of one generation; longer documents use the first part.
 */
export const MAX_DOCUMENT_CHARS = 150_000;
