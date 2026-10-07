-- Existing submissions get a value before the columns become NOT NULL: until now only a quiz's owner
-- could reach their quiz in the app, so the quiz owner is the submitter, and the total is the
-- quiz's current question count.
ALTER TABLE "quiz_submissions" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "quiz_submissions" ADD COLUMN "total_questions" integer;--> statement-breakpoint
UPDATE "quiz_submissions" s SET "user_id" = q."user_id" FROM "quizzes" q WHERE q."id" = s."quiz_id";--> statement-breakpoint
UPDATE "quiz_submissions" s SET "total_questions" = (SELECT count(*) FROM "questions" WHERE "quiz_id" = s."quiz_id");--> statement-breakpoint
ALTER TABLE "quiz_submissions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_submissions" ALTER COLUMN "total_questions" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_submissions" ADD CONSTRAINT "quiz_submissions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_submissions_user_id_idx" ON "quiz_submissions" USING btree ("user_id");
