import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Deletes the test users; their courses, chapters, quizzes and generations go with them. */
export const deleteUsers = (...ids: string[]) => db.delete(users).where(inArray(users.id, ids));

/** Replaces the test users with fresh ones, so every test starts without their data. */
export async function createUsers(...ids: string[]) {
  await deleteUsers(...ids);
  await db
    .insert(users)
    .values(ids.map((id) => ({ id, name: "Test", email: `${id}@example.com` })));
}
