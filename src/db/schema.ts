import {
  index,
  pgEnum,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "@auth/core/adapters";
import { relations } from "drizzle-orm";
import type { PlanId } from "@/lib/plans";

/////////////////////////////////////////////////////////
// Provider the authentication form here to be used in the accounts table
export const users = pgTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  stripeCustomerId: text("stripeCustomerId"),
  subscribed: boolean("subscribed").default(false),
});

export const userRelations = relations(users, ({ many }) => ({
  quizzes: many(quizzes),
}));

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);
///////////////////////////////////////////
// quiz tables
///////////////////////////////////////////

export const quizzes = pgTable(
  "quizzes",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("quizzes_user_id_idx").on(table.userId)],
);

export const quizzesRelations = relations(quizzes, ({ many }) => ({
  questions: many(questions),
  submissions: many(quizSubmissions),
}));

export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    questionText: text("question_text").notNull(),
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

export const quizSubmissions = pgTable(
  "quiz_submissions",
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
    index("quiz_submissions_quiz_id_idx").on(table.quizId),
    index("quiz_submissions_user_id_idx").on(table.userId),
  ],
);

export const quizSubmissionsRelations = relations(quizSubmissions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizSubmissions.quizId],
    references: [quizzes.id],
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("quiz_generations_user_id_created_at_idx").on(table.userId, table.createdAt)],
);
