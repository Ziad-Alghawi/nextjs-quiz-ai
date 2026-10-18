import "server-only";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { DrizzleQueryError } from "drizzle-orm/errors";
import postgres from "postgres";
import { db } from "@/db";
import { chapters, courses, quizzes } from "@/db/schema";
import { MAX_COURSES_PER_USER } from "@/lib/plans";

// Migration 0010 uses the same name for the course it moves existing quizzes into.
const DEFAULT_COURSE_NAME = "My quizzes";

/** The unique (user_id, name) index rejected the name: the user already has a course called that. */
const isDuplicateName = (error: unknown) =>
  error instanceof DrizzleQueryError &&
  error.cause instanceof postgres.PostgresError &&
  error.cause.code === "23505";

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

/**
 * The user's courses for the sidebar: "My quizzes" first (it is created on first use, so it can be
 * the newest), then the rest oldest first so the list doesn't reorder itself.
 */
export function listCourses(userId: string) {
  return db
    .select({ id: courses.id, name: courses.name })
    .from(courses)
    .where(eq(courses.userId, userId))
    .orderBy(desc(eq(courses.name, DEFAULT_COURSE_NAME)), asc(courses.id));
}

/** The course with its chapters and quizzes, only if it belongs to the user. Chapter text isn't loaded. */
export function getCourse(userId: string, courseId: number) {
  return db.query.courses.findFirst({
    columns: { id: true, name: true },
    where: and(eq(courses.id, courseId), eq(courses.userId, userId)),
    with: {
      chapters: {
        columns: { id: true, name: true, pageCount: true, sizeBytes: true, textTruncated: true },
        orderBy: asc(chapters.id),
      },
      quizzes: {
        columns: { id: true, name: true, description: true, kind: true },
        orderBy: desc(quizzes.createdAt),
      },
    },
  });
}

type CreateCourseResult = { id: number } | { error: "duplicate" | "limit" };

export async function createCourse(userId: string, name: string): Promise<CreateCourseResult> {
  // Count, then insert: parallel requests can pass the cap by a few, which is fine for a cap that
  // only exists against abuse.
  const [{ total }] = await db
    .select({ total: count() })
    .from(courses)
    .where(eq(courses.userId, userId));
  if (total >= MAX_COURSES_PER_USER) return { error: "limit" };

  try {
    const [{ id }] = await db
      .insert(courses)
      .values({ userId, name })
      .returning({ id: courses.id });
    return { id };
  } catch (error) {
    if (isDuplicateName(error)) return { error: "duplicate" };
    throw error;
  }
}

/** Renames the course if it belongs to the user. */
export async function renameCourse(
  userId: string,
  courseId: number,
  name: string,
): Promise<"renamed" | "not-found" | "duplicate"> {
  try {
    const renamed = await db
      .update(courses)
      .set({ name })
      .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
      .returning({ id: courses.id });
    return renamed.length > 0 ? "renamed" : "not-found";
  } catch (error) {
    if (isDuplicateName(error)) return "duplicate";
    throw error;
  }
}

/**
 * Deletes the course with its chapters and quizzes (foreign key cascades) if it belongs to the user.
 * Generations already used still count toward the monthly quota.
 */
export async function deleteCourse(userId: string, courseId: number) {
  const deleted = await db
    .delete(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId)))
    .returning({ id: courses.id });
  return deleted.length > 0;
}
