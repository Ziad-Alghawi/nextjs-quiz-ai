import "server-only";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { chapters, courses } from "@/db/schema";
import { MAX_CHAPTERS_PER_COURSE, PLANS, type PlanId } from "@/lib/plans";
import { getPlan } from "./usage";

type NewChapter = {
  name: string;
  text: string;
  textTruncated: boolean;
  pageCount: number;
  sizeBytes: number;
};

type AddChapterResult =
  | { chapterId: number }
  | { error: "not-found" }
  | { error: "course-full"; limit: number }
  | { error: "user-full"; limit: number; plan: PlanId };

/**
 * Saves a chapter (a PDF's text) in the user's course if the course and the user still have room.
 * A per-user advisory lock makes parallel uploads queue up, so they can't both take the last place.
 */
export async function addChapter(
  userId: string,
  courseId: number,
  chapter: NewChapter,
): Promise<AddChapterResult> {
  const plan = await getPlan(userId);
  const { maxChapters } = PLANS[plan];

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`chapters:${userId}`}))`);

    // The "My quizzes" folder holds quick quizzes only, no chapters.
    const course = await tx.query.courses.findFirst({
      columns: { id: true },
      where: and(
        eq(courses.id, courseId),
        eq(courses.userId, userId),
        eq(courses.isDefault, false),
      ),
    });
    if (!course) return { error: "not-found" };

    const [[{ inCourse }], [{ ofUser }]] = await Promise.all([
      tx.select({ inCourse: count() }).from(chapters).where(eq(chapters.courseId, courseId)),
      tx
        .select({ ofUser: count() })
        .from(chapters)
        .innerJoin(courses, eq(chapters.courseId, courses.id))
        .where(eq(courses.userId, userId)),
    ]);
    if (inCourse >= MAX_CHAPTERS_PER_COURSE) {
      return { error: "course-full", limit: MAX_CHAPTERS_PER_COURSE };
    }
    if (ofUser >= maxChapters) return { error: "user-full", limit: maxChapters, plan };

    const [{ chapterId }] = await tx
      .insert(chapters)
      .values({ courseId, ...chapter })
      .returning({ chapterId: chapters.id });
    return { chapterId };
  });
}

/** The chapters' names and texts in upload order, leaving out ids that aren't in the user's course. */
export function getChapterTexts(userId: string, courseId: number, chapterIds: number[]) {
  return db
    .select({ name: chapters.name, text: chapters.text })
    .from(chapters)
    .innerJoin(courses, eq(chapters.courseId, courses.id))
    .where(
      and(eq(courses.id, courseId), eq(courses.userId, userId), inArray(chapters.id, chapterIds)),
    )
    .orderBy(asc(chapters.id));
}

/**
 * Deletes the chapter if its course belongs to the user and returns the course id, or null.
 * Quizzes made from it stay; only their link to it goes (quiz_sources cascades).
 */
export async function deleteChapter(userId: string, chapterId: number) {
  const usersCourses = db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.userId, userId));
  const [deleted] = await db
    .delete(chapters)
    .where(and(eq(chapters.id, chapterId), inArray(chapters.courseId, usersCourses)))
    .returning({ courseId: chapters.courseId });
  return deleted?.courseId ?? null;
}
