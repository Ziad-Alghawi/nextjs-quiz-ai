import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, onTestFinished } from "vitest";
import { db } from "@/db";
import { courses, quizAttempts, quizGenerations, quizzes, users } from "@/db/schema";
import { createUsers, deleteUsers } from "@/test/db-fixtures";
import { generatedQuiz } from "@/test/generated-quiz";
import { getOrCreateDefaultCourse } from "./courses";
import { deleteExpiredGuests, moveGuestData } from "./guests";
import { createQuiz } from "./quizzes";
import { getMonthlyUsage } from "./usage";

const GUEST = "guests-db-test-guest";
const USER = "guests-db-test-user";
const YOUNG_GUEST = "guests-db-test-young-guest";

/** The guest's trial: two quick quizzes, an attempt and their generations, one from last month. */
async function addTrial() {
  const first = await createQuiz(GUEST, generatedQuiz(5, "Cells"));
  const second = await createQuiz(GUEST, generatedQuiz(5, "Atoms"));
  await db
    .insert(quizAttempts)
    .values({ quizId: first, userId: GUEST, score: 4, totalQuestions: 5 });
  await db.insert(quizGenerations).values([
    { userId: GUEST, plan: "free", status: "succeeded" },
    {
      userId: GUEST,
      plan: "free",
      status: "succeeded",
      createdAt: sql`now() - interval '40 days'`,
    },
  ]);
  return [first, second];
}

const ownerOf = async (quizId: number) => {
  const [quiz] = await db
    .select({ userId: quizzes.userId, courseId: quizzes.courseId })
    .from(quizzes)
    .where(eq(quizzes.id, quizId));
  return quiz;
};

beforeEach(() => createUsers(GUEST, USER, YOUNG_GUEST));
afterAll(() => deleteUsers(GUEST, USER, YOUNG_GUEST));

describe("moveGuestData", () => {
  it("moves quizzes, attempts and generations to a new account", async () => {
    const quizIds = await addTrial();

    await moveGuestData(GUEST, USER);

    const folderId = await getOrCreateDefaultCourse(USER, db);
    for (const quizId of quizIds) {
      expect(await ownerOf(quizId)).toEqual({ userId: USER, courseId: folderId });
    }
    const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.userId, USER));
    expect(attempts).toHaveLength(1);
    // Both generations count toward this month, also the one from last month.
    expect((await getMonthlyUsage(USER)).used).toBe(2);
    expect(
      await db.select().from(quizGenerations).where(eq(quizGenerations.userId, GUEST)),
    ).toEqual([]);
  });

  it("adds the trial to the folder an existing account already has", async () => {
    const folderId = await getOrCreateDefaultCourse(USER, db);
    const ownQuiz = await createQuiz(USER, generatedQuiz(5, "Own"));
    const [guestQuiz] = await addTrial();

    await moveGuestData(GUEST, USER);

    expect(await ownerOf(guestQuiz)).toEqual({ userId: USER, courseId: folderId });
    expect(await ownerOf(ownQuiz)).toEqual({ userId: USER, courseId: folderId });
    const folders = await db.select().from(courses).where(eq(courses.userId, USER));
    expect(folders).toHaveLength(1);
  });

  it("moves nothing when it fails halfway", async () => {
    const [quizId] = await addTrial();
    // Makes the last step (the generation rows) fail, after quizzes and attempts were moved.
    await db.execute(sql`
      create function guests_db_test_fail() returns trigger language plpgsql as
        $$ begin raise exception 'moving generations failed'; end $$`);
    await db.execute(sql`
      create trigger guests_db_test_fail before update on quiz_generations
        for each row when (old.user_id = ${sql.raw(`'${GUEST}'`)}) execute function guests_db_test_fail()`);
    onTestFinished(async () => {
      await db.execute(sql`drop trigger guests_db_test_fail on quiz_generations`);
      await db.execute(sql`drop function guests_db_test_fail`);
    });

    await expect(moveGuestData(GUEST, USER)).rejects.toMatchObject({
      cause: { message: "moving generations failed" },
    });

    expect(await ownerOf(quizId)).toMatchObject({ userId: GUEST });
    expect(await db.select().from(quizAttempts).where(eq(quizAttempts.userId, GUEST))).toHaveLength(
      1,
    );
    expect(await db.select().from(courses).where(eq(courses.userId, USER))).toEqual([]);
  });
});

describe("deleteExpiredGuests", () => {
  const age = (id: string, days: number, isAnonymous: boolean) =>
    db
      .update(users)
      .set({ isAnonymous, createdAt: sql`now() - make_interval(days => ${days})` })
      .where(eq(users.id, id));
  const exists = async (id: string) =>
    (await db.select().from(users).where(eq(users.id, id))).length === 1;

  it("deletes guests older than 7 days with their trial, and keeps the rest", async () => {
    const [quizId] = await addTrial();
    await age(GUEST, 8, true);
    await age(YOUNG_GUEST, 6, true);
    await age(USER, 8, false);

    expect(await deleteExpiredGuests()).toBeGreaterThanOrEqual(1);

    expect(await exists(GUEST)).toBe(false);
    expect(await db.select().from(quizzes).where(eq(quizzes.id, quizId))).toEqual([]);
    expect(await db.select().from(quizAttempts).where(eq(quizAttempts.userId, GUEST))).toEqual([]);
    expect(
      await db.select().from(quizGenerations).where(eq(quizGenerations.userId, GUEST)),
    ).toEqual([]);
    expect(await exists(YOUNG_GUEST)).toBe(true);
    expect(await exists(USER)).toBe(true);
  });
});
