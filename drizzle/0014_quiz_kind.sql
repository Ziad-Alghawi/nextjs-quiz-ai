CREATE TYPE "public"."quiz_kind" AS ENUM('generated', 'review');--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "kind" "quiz_kind" DEFAULT 'generated' NOT NULL;