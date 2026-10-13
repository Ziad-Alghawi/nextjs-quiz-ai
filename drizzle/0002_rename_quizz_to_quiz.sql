-- Fix the "quizz" spelling in table, column, sequence and primary key names. Renames keep all data.
ALTER TABLE "quizz_submissions" RENAME TO "quiz_submissions";--> statement-breakpoint
ALTER TABLE "quiz_submissions" RENAME COLUMN "quizz_id" TO "quiz_id";--> statement-breakpoint
ALTER TABLE "quiz_submissions" RENAME CONSTRAINT "quizz_submissions_pkey" TO "quiz_submissions_pkey";--> statement-breakpoint
ALTER SEQUENCE "quizz_submissions_id_seq" RENAME TO "quiz_submissions_id_seq";--> statement-breakpoint
ALTER TABLE "questions" RENAME COLUMN "quizz_id" TO "quiz_id";
