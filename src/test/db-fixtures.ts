import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { chapters, courses, users } from "@/db/schema";

/** Deletes the test users; their courses, chapters, quizzes and generations go with them. */
export const deleteUsers = (...ids: string[]) => db.delete(users).where(inArray(users.id, ids));

/** Replaces the test users with fresh ones, so every test starts without their data. */
export async function createUsers(...ids: string[]) {
  await deleteUsers(...ids);
  await db
    .insert(users)
    .values(ids.map((id) => ({ id, name: "Test", email: `${id}@example.com` })));
}

/** Adds a course for the user and returns its id. */
export async function addCourse(userId: string, name = "Biology") {
  const [course] = await db.insert(courses).values({ userId, name }).returning({ id: courses.id });
  return course.id;
}

/** Adds a one-page chapter with the given text to the course and returns its id. */
export async function addChapter(courseId: number, name = "ch1.pdf", text = "Text.") {
  const [chapter] = await db
    .insert(chapters)
    .values({ courseId, name, text, pageCount: 1, sizeBytes: 100 })
    .returning({ id: chapters.id });
  return chapter.id;
}
