-- Existing quizzes move into a default course "My quizzes" of their owner (the same name as
-- DEFAULT_COURSE_NAME in src/server/services/courses.ts). Safe to run again: the unique
-- (user_id, name) index skips courses that already exist, and only quizzes without a course move.
INSERT INTO "courses" ("user_id", "name")
SELECT DISTINCT "user_id", 'My quizzes' FROM "quizzes" WHERE "course_id" IS NULL
ON CONFLICT ("user_id", "name") DO NOTHING;--> statement-breakpoint
UPDATE "quizzes" SET "course_id" = "courses"."id"
FROM "courses"
WHERE "quizzes"."course_id" IS NULL
  AND "courses"."user_id" = "quizzes"."user_id"
  AND "courses"."name" = 'My quizzes';--> statement-breakpoint
ALTER TABLE "quizzes" ALTER COLUMN "course_id" SET NOT NULL;
