/** Plan limits. The server enforces them; the UI only displays them. */
export const PLANS = {
  free: { label: "Free", monthlyQuizzes: 10, maxChapters: 30 },
  pro: { label: "Pro", monthlyQuizzes: 50, maxChapters: 150 },
} as const;

export type PlanId = keyof typeof PLANS;

/** On every plan. Courses cost nothing to create, so this only stops scripted mass creation. */
export const MAX_COURSES_PER_USER = 30;

/** On every plan. With the per-plan maxChapters, bounds the stored text per user. */
export const MAX_CHAPTERS_PER_COURSE = 15;

/** On every plan, failed uploads included: reading a PDF costs server time even when it fails. */
export const CHAPTER_UPLOAD_LIMIT = { uploads: 20, windowMinutes: 10 } as const;

/** On every plan: at most this many generation attempts per user in the window. */
export const GENERATION_BURST_LIMIT = { attempts: 3, windowMinutes: 10 } as const;

/**
 * Document text sent to Gemini, in characters: about 40k tokens (4 characters per token in English,
 * fewer in other languages). Bounds the cost of one generation; longer documents use the first part.
 */
export const MAX_DOCUMENT_CHARS = 150_000;
