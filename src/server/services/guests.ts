import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizAttempts, quizGenerations, quizzes, users } from "@/db/schema";
import { GUEST_TRIAL } from "@/lib/plans";
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

/**
 * Deletes guests whose trial started more than GUEST_TRIAL.keepDays ago, and returns how many.
 * Their folder, quizzes, attempts, generations and sessions go with them (ON DELETE CASCADE); a
 * guest who signed up was already removed when the trial moved to the account.
 */
export async function deleteExpiredGuests() {
  const deleted = await db
    .delete(users)
    .where(
      and(
        eq(users.isAnonymous, true),
        lt(users.createdAt, sql`now() - make_interval(days => ${GUEST_TRIAL.keepDays})`),
      ),
    )
    .returning({ id: users.id });
  return deleted.length;
}
