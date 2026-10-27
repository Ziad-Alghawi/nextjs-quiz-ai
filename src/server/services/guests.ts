import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizAttempts, quizGenerations, quizzes } from "@/db/schema";
import { getOrCreateDefaultCourse } from "./courses";

/**
 * Gives a guest's trial to the account they signed up or signed in with: their quizzes go into the
 * account's "My quizzes" folder, with their attempts, and their generations count toward the
 * account's quota. All or nothing; Better Auth deletes the guest only after this succeeds.
 */
export async function moveGuestData(guestId: string, userId: string) {
  await db.transaction(async (tx) => {
    // The lock reserveGeneration takes, so no generation of the guest is reserved halfway through.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${guestId}))`);

    const folderId = await getOrCreateDefaultCourse(userId, tx);
    await tx.update(quizzes).set({ userId, courseId: folderId }).where(eq(quizzes.userId, guestId));
    await tx.update(quizAttempts).set({ userId }).where(eq(quizAttempts.userId, guestId));
    // Trial generations from an earlier month count toward the first month of the account.
    await tx
      .update(quizGenerations)
      .set({
        userId,
        createdAt: sql`greatest(${quizGenerations.createdAt}, date_trunc('month', now()))`,
      })
      .where(eq(quizGenerations.userId, guestId));
  });
}
