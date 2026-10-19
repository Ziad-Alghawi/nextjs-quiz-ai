/** Plan limits. The server enforces them; the UI only displays them. */
export const PLANS = {
  free: { label: "Free", monthlyQuizzes: 10, maxChapters: 30, questionCounts: [5, 10, 15] },
  pro: {
    label: "Pro",
    monthlyQuizzes: 50,
    maxChapters: 150,
    questionCounts: [5, 10, 15, 20, 25],
  },
} as const;

export type PlanId = keyof typeof PLANS;

/** The question count the pickers start on. Allowed on every plan. */
export const DEFAULT_QUESTION_COUNT = 10;

/** Every question count some plan offers; each plan checks its own on top. */
export const QUESTION_COUNTS: readonly number[] = [
  ...new Set(Object.values(PLANS).flatMap((plan) => plan.questionCounts)),
];

/** Whether the plan offers quizzes with this many questions. */
export const isQuestionCountAllowed = (plan: PlanId, count: number) =>
  PLANS[plan].questionCounts.some((allowed) => allowed === count);

/** What to tell a user whose plan doesn't offer the question count they asked for. */
export const questionCountUpgradeMessage = (count: number) =>
  `Quizzes with ${count} questions are part of Pro. Upgrade, or choose fewer questions.`;

/** The most questions a quiz can have on any plan; every question-count check uses this. */
export const MAX_QUESTIONS = Math.max(...QUESTION_COUNTS);

/** On every plan. Courses cost nothing to create, so this only stops scripted mass creation. */
export const MAX_COURSES_PER_USER = 30;

/** On every plan. With the per-plan maxChapters, bounds the stored text per user. */
export const MAX_CHAPTERS_PER_COURSE = 15;

/** On every plan, failed uploads included: reading a PDF costs server time even when it fails. */
export const CHAPTER_UPLOAD_LIMIT = { uploads: 20, windowMinutes: 10 } as const;

/**
 * On every plan. Below Vercel's 4.5 MB request body limit, which rejects larger uploads before our
 * code runs.
 */
export const MAX_PDF_BYTES = 4 * 1024 * 1024;

/** Review quizzes (questions copied from other quizzes, no AI) take 2 up to this many quizzes. */
export const MAX_REVIEW_QUIZZES = 10;

/** On every plan. Reviews cost no AI, so this only stops scripted mass creation. */
export const REVIEW_BURST_LIMIT = { reviews: 10, windowMinutes: 10 } as const;

/** On every plan: at most this many generation attempts per user in the window. */
export const GENERATION_BURST_LIMIT = { attempts: 3, windowMinutes: 10 } as const;

/**
 * Generation attempts per UTC day across all users. Gemini's paid tier has no per-day request
 * quota, so this keeps one busy day from using up the monthly spend cap.
 */
export const DAILY_GENERATION_LIMIT = 50;

/**
 * Document text sent to Gemini, in characters: about 40k tokens (4 characters per token in English,
 * fewer in other languages). Bounds the cost of one generation; longer documents use the first part.
 */
export const MAX_DOCUMENT_CHARS = 150_000;
