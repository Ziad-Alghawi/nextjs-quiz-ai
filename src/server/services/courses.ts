import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { cache } from "react";
import postgres from "postgres";
import { db } from "@/db";
import { chapters, courses, quizzes } from "@/db/schema";
import { MAX_COURSES_PER_USER } from "@/lib/plans";
import { DEFAULT_COURSE_NAME } from "@/lib/validations/course";

/** The unique (user_id, name) index rejected the name: the user already has a course called that. */
const isDuplicateName = (error: unknown) =>
  error instanceof DrizzleQueryError &&
  error.cause instanceof postgres.PostgresError &&
  error.cause.code === "23505";

/**
 * The id of the user's "My quizzes" folder, created on first use. One statement: the no-op update
 * on conflict makes RETURNING give the existing id, also when two requests create it at once.
 */
export async function getOrCreateDefaultCourse(
  executor: Pick<typeof db, "insert">,
  userId: string,
) {
  const [{ id }] = await executor
    .insert(courses)
    .values({ userId, name: DEFAULT_COURSE_NAME, isDefault: true })
    .onConflictDoUpdate({
      target: courses.userId,
      targetWhere: sql`${courses.isDefault}`,
      set: { isDefault: true },
    })
    .returning({ id: courses.id });
  return id;
}

/**
 * The user's courses with the "My quizzes" folder flagged, oldest first so the sidebar doesn't
 * reorder itself. Cached per request, since the header and the sidebar both show them; async, so
 * the cache holds the result and not a query that would run again on every await.
 */
export const listCourses = cache(async (userId: string) =>
  db
    .select({ id: courses.id, name: courses.name, isDefault: courses.isDefault })
    .from(courses)
    .where(eq(courses.userId, userId))
    .orderBy(asc(courses.id)),
);

/** The course with its chapters and quizzes, only if it belongs to the user. Chapter text isn't loaded. */
export function getCourse(userId: string, courseId: number) {
  return db.query.courses.findFirst({
    columns: { id: true, name: true, isDefault: true },
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

/** Renames the course if it belongs to the user. The "My quizzes" folder keeps its name. */
export async function renameCourse(
  userId: string,
  courseId: number,
  name: string,
): Promise<"renamed" | "not-found" | "duplicate"> {
  try {
    const renamed = await db
      .update(courses)
      .set({ name })
      .where(
        and(eq(courses.id, courseId), eq(courses.userId, userId), eq(courses.isDefault, false)),
      )
      .returning({ id: courses.id });
    return renamed.length > 0 ? "renamed" : "not-found";
  } catch (error) {
    if (isDuplicateName(error)) return "duplicate";
    throw error;
  }
}

/**
 * Deletes the course with its chapters and quizzes (foreign key cascades) if it belongs to the user.
 * The "My quizzes" folder stays. Generations already used still count toward the monthly quota.
 */
export async function deleteCourse(userId: string, courseId: number) {
  const deleted = await db
    .delete(courses)
    .where(and(eq(courses.id, courseId), eq(courses.userId, userId), eq(courses.isDefault, false)))
    .returning({ id: courses.id });
  return deleted.length > 0;
}
