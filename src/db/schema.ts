import {
  bigint,
  index,
  uniqueIndex,
  pgEnum,
  timestamp,
  pgTable,
  text,
  integer,
  serial,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { PlanId } from "@/lib/plans";

export const users = pgTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // One Stripe customer per user; the unique index also serves the webhook, which looks users up by it.
  stripeCustomerId: text("stripeCustomerId").unique(),
  subscribed: boolean("subscribed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  courses: many(courses),
  quizzes: many(quizzes),
}));

// Better Auth tables.
export const authAccounts = pgTable(
  "auth_account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("auth_account_user_id_idx").on(table.userId),
    uniqueIndex("auth_account_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const authSessions = pgTable(
  "auth_session",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("auth_session_user_id_idx").on(table.userId)],
);

export const authVerifications = pgTable(
  "auth_verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("auth_verification_identifier_idx").on(table.identifier)],
);

// Request counters for Better Auth's rate limiter, shared by all server instances.
export const rateLimits = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const courses = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  // Also keeps "My quizzes" unique: getOrCreateDefaultCourse's upsert and the backfill in migration
  // 0010 rely on it, so parallel requests or a re-run never create two of them.
  (table) => [uniqueIndex("courses_user_id_name_idx").on(table.userId, table.name)],
);

export const coursesRelations = relations(courses, ({ many }) => ({
  chapters: many(chapters),
  quizzes: many(quizzes),
}));

// A PDF in a course; only the extracted text is kept, not the file. The table keeps its first name,
// "sources", so renaming it needs no migration.
export const chapters = pgTable(
  "sources",
  {
    id: serial("id").primaryKey(),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    text: text("text").notNull(),
    // Long PDFs keep only their first part (MAX_DOCUMENT_CHARS); the course page says so.
    textTruncated: boolean("text_truncated").default(false).notNull(),
    pageCount: integer("page_count").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("sources_course_id_idx").on(table.courseId)],
);

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  course: one(courses, { fields: [chapters.courseId], references: [courses.id] }),
  quizChapters: many(quizChapters),
}));

// "review" quizzes are copied from other quizzes of the course, without AI.
export const quizKind = pgEnum("quiz_kind", ["generated", "review"]);

export const quizzes = pgTable(
  "quizzes",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    kind: quizKind("kind").default("generated").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("quizzes_user_id_idx").on(table.userId),
    index("quizzes_course_id_idx").on(table.courseId),
  ],
);

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  course: one(courses, { fields: [quizzes.courseId], references: [courses.id] }),
  questions: many(questions),
  attempts: many(quizAttempts),
  quizChapters: many(quizChapters),
}));

// The chapters a quiz was generated from. Deleting a chapter keeps its quizzes, only the link goes.
export const quizChapters = pgTable(
  "quiz_sources",
  {
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    chapterId: integer("source_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.quizId, table.chapterId] }),
    index("quiz_sources_source_id_idx").on(table.chapterId),
  ],
);

export const quizChaptersRelations = relations(quizChapters, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizChapters.quizId], references: [quizzes.id] }),
  chapter: one(chapters, { fields: [quizChapters.chapterId], references: [chapters.id] }),
}));

export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    questionText: text("question_text").notNull(),
    // Why the correct answer is right; quizzes made before explanations were added have none.
    explanation: text("explanation"),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
  },
  (table) => [index("questions_quiz_id_idx").on(table.quizId)],
);

export const questionsRelations = relations(questions, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
  answers: many(questionAnswers),
}));

export const questionAnswers = pgTable(
  "answers",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    answerText: text("answer_text").notNull(),
    isCorrect: boolean("is_correct").default(false).notNull(),
  },
  (table) => [index("answers_question_id_idx").on(table.questionId)],
);

export const questionAnswersRelations = relations(questionAnswers, ({ one }) => ({
  question: one(questions, {
    fields: [questionAnswers.questionId],
    references: [questions.id],
  }),
}));

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: serial("id").primaryKey(),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    // Stored with the score so percentages stay right if the quiz is edited later.
    totalQuestions: integer("total_questions").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("quiz_attempts_quiz_id_idx").on(table.quizId),
    index("quiz_attempts_user_id_idx").on(table.userId),
  ],
);

export const quizAttemptsRelations = relations(quizAttempts, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [quizAttempts.quizId],
    references: [quizzes.id],
  }),
  answers: many(attemptAnswers),
}));

// The answer chosen for each question of an attempt; correctness comes from answers.is_correct.
export const attemptAnswers = pgTable(
  "attempt_answers",
  {
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    answerId: integer("answer_id")
      .notNull()
      .references(() => questionAnswers.id, { onDelete: "cascade" }),
  },
  // One chosen answer per question. The other two indexes keep cascading deletes of questions and
  // answers from scanning the whole table.
  (table) => [
    primaryKey({ columns: [table.attemptId, table.questionId] }),
    index("attempt_answers_question_id_idx").on(table.questionId),
    index("attempt_answers_answer_id_idx").on(table.answerId),
  ],
);

export const attemptAnswersRelations = relations(attemptAnswers, ({ one }) => ({
  attempt: one(quizAttempts, { fields: [attemptAnswers.attemptId], references: [quizAttempts.id] }),
  question: one(questions, { fields: [attemptAnswers.questionId], references: [questions.id] }),
  answer: one(questionAnswers, {
    fields: [attemptAnswers.answerId],
    references: [questionAnswers.id],
  }),
}));

export const generationStatus = pgEnum("generation_status", ["pending", "succeeded", "failed"]);

// One row per quiz generation attempt. Quotas count these rows rather than quizzes, so deleting a
// quiz doesn't give a generation back.
export const quizGenerations = pgTable(
  "quiz_generations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan").$type<PlanId>().notNull(),
    status: generationStatus("status").default("pending").notNull(),
    // Set when the generation finishes, so the cost per quiz is measured. Tokens add up every model
    // call of the generation; the model is the one that made the last call.
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("quiz_generations_user_id_created_at_idx").on(table.userId, table.createdAt)],
);
