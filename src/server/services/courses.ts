import "server-only";
import { db } from "@/db";
import { courses } from "@/db/schema";

// Migration 0010 uses the same name for the course it moves existing quizzes into.
const DEFAULT_COURSE_NAME = "My quizzes";

/**
 * The id of the user's "My quizzes" course, created on first use. One statement: the no-op update
 * on conflict makes RETURNING give the existing id, also when two requests create it at once.
 */
export async function getOrCreateDefaultCourse(
  executor: Pick<typeof db, "insert">,
  userId: string,
) {
  const [{ id }] = await executor
    .insert(courses)
    .values({ userId, name: DEFAULT_COURSE_NAME })
    .onConflictDoUpdate({
      target: [courses.userId, courses.name],
      set: { name: DEFAULT_COURSE_NAME },
    })
    .returning({ id: courses.id });
  return id;
}
