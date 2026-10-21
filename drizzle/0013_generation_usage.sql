ALTER TABLE "quiz_generations" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "quiz_generations" ADD COLUMN "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "quiz_generations" ADD COLUMN "output_tokens" integer;