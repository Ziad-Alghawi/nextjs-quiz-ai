-- An attempt is one run through a quiz; attempt_answers (0016) will hold its chosen answers. Renames
-- keep all data. The constraint and index names follow the table so they match the Drizzle schema.
ALTER TABLE "quiz_submissions" RENAME TO "quiz_attempts";--> statement-breakpoint
ALTER SEQUENCE "quiz_submissions_id_seq" RENAME TO "quiz_attempts_id_seq";--> statement-breakpoint
ALTER TABLE "quiz_attempts" RENAME CONSTRAINT "quiz_submissions_pkey" TO "quiz_attempts_pkey";--> statement-breakpoint
ALTER TABLE "quiz_attempts" RENAME CONSTRAINT "quiz_submissions_quiz_id_quizzes_id_fk" TO "quiz_attempts_quiz_id_quizzes_id_fk";--> statement-breakpoint
ALTER TABLE "quiz_attempts" RENAME CONSTRAINT "quiz_submissions_user_id_user_id_fk" TO "quiz_attempts_user_id_user_id_fk";--> statement-breakpoint
ALTER INDEX "quiz_submissions_quiz_id_idx" RENAME TO "quiz_attempts_quiz_id_idx";--> statement-breakpoint
ALTER INDEX "quiz_submissions_user_id_idx" RENAME TO "quiz_attempts_user_id_idx";
