import { formatOrList } from "./utils";

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

export const BILLING_INTERVALS = ["month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/**
 * Pro's prices in USD, for display only: Stripe charges the price behind STRIPE_PRICE_ID (month)
 * and STRIPE_YEARLY_PRICE_ID (year), so a change here needs new prices in Stripe too.
 */
export const PRO_PRICES: Record<BillingInterval, number> = { month: 3.99, year: 35.88 };

export const PRO_LABELS: Record<BillingInterval, string> = {
  month: "Pro Monthly",
  year: "Pro Yearly",
};

/** The question count the pickers start on. Allowed on every plan. */
export const DEFAULT_QUESTION_COUNT = 10;

/** Every question count some plan offers; each plan checks its own on top. */
export const QUESTION_COUNTS: readonly number[] = [
  ...new Set(Object.values(PLANS).flatMap((plan) => plan.questionCounts)),
];

/** The quota line under a generate button. */
export const monthlyRemainingText = (plan: PlanId, remaining: number) =>
  `${remaining} of ${PLANS[plan].monthlyQuizzes} quizzes left this month`;

export const isQuestionCountAllowed = (plan: PlanId, count: number) =>
  PLANS[plan].questionCounts.some((allowed) => allowed === count);

/** What to tell a user whose plan doesn't offer the question count they asked for. */
export const questionCountUpgradeMessage = (count: number) =>
  `Quizzes with ${count} questions are part of Pro. Upgrade, or choose fewer questions.`;

/** The most questions a quiz can have on any plan; every question-count check uses this. */
export const MAX_QUESTIONS = Math.max(...QUESTION_COUNTS);

/** Course exams copy questions without AI, so every plan offers every count. */
export const EXAM_QUESTION_COUNTS: readonly number[] = [10, 20, 30];

/** The most questions an attempt can answer: a generated quiz's or an exam's. */
export const MAX_ATTEMPT_QUESTIONS = Math.max(MAX_QUESTIONS, ...EXAM_QUESTION_COUNTS);

/** On every plan. Courses cost nothing to create, so this only stops scripted mass creation. */
export const MAX_COURSES_PER_USER = 30;

/** On every plan. With the per-plan maxChapters, bounds the stored text per user. */
export const MAX_CHAPTERS_PER_COURSE = 15;

/** At most `max` requests per user in each window of `windowMinutes`. */
export type RateLimit = { max: number; windowMinutes: number };

/** On every plan, failed uploads included: reading a PDF costs server time even when it fails. */
export const CHAPTER_UPLOAD_LIMIT = { max: 20, windowMinutes: 10 } as const satisfies RateLimit;

/**
 * On every plan. Below Vercel's 4.5 MB request body limit, which rejects larger uploads before our
 * code runs.
 */
export const MAX_PDF_MB = 4;
export const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

/** Review quizzes (questions copied from other quizzes, no AI) take 2 up to this many quizzes. */
export const MAX_REVIEW_QUIZZES = 10;

/** On every plan. Reviews cost no AI, so this only stops scripted mass creation. */
export const REVIEW_BURST_LIMIT = { max: 10, windowMinutes: 10 } as const satisfies RateLimit;

/** On every plan. Exams cost no AI either, so this only stops scripted mass creation. */
export const EXAM_BURST_LIMIT = { max: 10, windowMinutes: 10 } as const satisfies RateLimit;

/** On every plan. Copies of shared quizzes cost no AI either, so this only stops mass copying. */
export const SHARED_COPY_BURST_LIMIT = { max: 10, windowMinutes: 10 } as const satisfies RateLimit;

/** On every plan: at most this many generation attempts per user in the window. */
export const GENERATION_BURST_LIMIT = { max: 3, windowMinutes: 10 } as const satisfies RateLimit;

/**
 * Generation attempts per UTC day across all users. Gemini's paid tier has no per-day request
 * quota, so this keeps one busy day from using up the monthly spend cap.
 */
export const DAILY_GENERATION_LIMIT = 50;

/**
 * The guest trial, without an account. `dailyQuizzes` is shared by all guests and comes out of
 * DAILY_GENERATION_LIMIT, so new guests (new cookies, other IPs) can't raise the daily cost.
 */
export const GUEST_TRIAL = {
  /** Generations per guest, in total. */
  quizzes: 3,
  dailyQuizzes: 5,
  questionCounts: [5, 10],
  maxDocumentChars: 50_000,
  /** Guest sign-ins per IP address and hour. */
  signInsPerHour: 3,
  /** Guests are deleted with their trial this many days after it started. */
  keepDays: 7,
} as const;

/**
 * Document text sent to Gemini, in characters: about 40k tokens (4 characters per token in English,
 * fewer in other languages). Bounds the cost of one generation; longer documents use the first part.
 */
export const MAX_DOCUMENT_CHARS = 150_000;

/** What each plan includes, for the pricing cards. Pro lists only what it adds to Free. */
export const PLAN_FEATURES: Record<PlanId, readonly string[]> = {
  free: [
    `${PLANS.free.monthlyQuizzes} AI quizzes a month`,
    `${formatOrList(PLANS.free.questionCounts)} questions per quiz`,
    `${PLANS.free.maxChapters} chapters (PDFs up to ${MAX_PDF_MB} MB)`,
    "Explanation for every answer",
    "Review quizzes and course exams (don't use your quota)",
    "Practise your mistakes",
    "Saved attempts, stats and streaks",
  ],
  pro: [
    `${PLANS.pro.monthlyQuizzes} AI quizzes a month (${PLANS.pro.monthlyQuizzes / PLANS.free.monthlyQuizzes}× more)`,
    `Up to ${Math.max(...PLANS.pro.questionCounts)} questions per quiz`,
    `${PLANS.pro.maxChapters} chapters`,
  ],
};
