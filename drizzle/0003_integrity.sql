-- Data cleanup so the constraints below can be added.
-- Quizzes without an owner were created before sign-in was required; nobody can open them anymore,
-- so they are deleted together with their questions, answers and submissions. Orphaned rows go too.
DELETE FROM "quiz_submissions" WHERE "quiz_id" IS NULL OR "quiz_id" NOT IN (SELECT "id" FROM "quizzes" WHERE "user_id" IS NOT NULL);--> statement-breakpoint
DELETE FROM "answers" WHERE "question_id" IS NULL OR "question_id" NOT IN (SELECT q."id" FROM "questions" q JOIN "quizzes" z ON z."id" = q."quiz_id" WHERE z."user_id" IS NOT NULL);--> statement-breakpoint
DELETE FROM "questions" WHERE "quiz_id" IS NULL OR "quiz_id" NOT IN (SELECT "id" FROM "quizzes" WHERE "user_id" IS NOT NULL);--> statement-breakpoint
DELETE FROM "quizzes" WHERE "user_id" IS NULL;--> statement-breakpoint
-- Rows with missing content can't be shown or scored.
DELETE FROM "answers" WHERE "answer_text" IS NULL OR "question_id" IN (SELECT "id" FROM "questions" WHERE "question_text" IS NULL);--> statement-breakpoint
DELETE FROM "questions" WHERE "question_text" IS NULL;--> statement-breakpoint
DELETE FROM "quiz_submissions" WHERE "score" IS NULL;--> statement-breakpoint
UPDATE "answers" SET "is_correct" = false WHERE "is_correct" IS NULL;--> statement-breakpoint
UPDATE "quizzes" SET "name" = 'Untitled quiz' WHERE "name" IS NULL;--> statement-breakpoint
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "answers" ALTER COLUMN "question_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "answers" ALTER COLUMN "answer_text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "answers" ALTER COLUMN "is_correct" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "answers" ALTER COLUMN "is_correct" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "question_text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "quiz_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_submissions" ALTER COLUMN "score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_submissions" ALTER COLUMN "quiz_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_submissions" ADD CONSTRAINT "quiz_submissions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "answers_question_id_idx" ON "answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "questions_quiz_id_idx" ON "questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quizzes_user_id_idx" ON "quizzes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_submissions_quiz_id_idx" ON "quiz_submissions" USING btree ("quiz_id");