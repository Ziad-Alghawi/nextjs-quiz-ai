-- Until now the app found the "My quizzes" folder by its name (migration 0010 and
-- getOrCreateDefaultCourse); the flag replaces the name. The unique (user_id, name) index allows one
-- per user, so the unique index below can't fail.
ALTER TABLE "courses" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "courses" SET "is_default" = true WHERE "name" = 'My quizzes';--> statement-breakpoint
CREATE UNIQUE INDEX "courses_user_id_default_idx" ON "courses" USING btree ("user_id") WHERE "courses"."is_default";