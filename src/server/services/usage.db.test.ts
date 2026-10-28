import { eq, inArray, like, sql, type SQL } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { quizGenerations, rateLimits, users } from "@/db/schema";
import { DAILY_GENERATION_LIMIT, GENERATION_BURST_LIMIT, GUEST_TRIAL, PLANS } from "@/lib/plans";
import { utcDate } from "@/lib/time";
import { createUsers, deleteUsers } from "@/test/db-fixtures";
import {
  finishGeneration,
  GenerationLimitError,
  getMonthlyUsage,
  getTrialUsage,
  reserveGeneration,
  runGeneration,
} from "./usage";

const USER = "usage-db-test-user";
// More guests than the daily trial slots, to race for them.
const GUESTS = Array.from(
  { length: GUEST_TRIAL.dailyQuizzes + 1 },
  (_, i) => `usage-db-test-guest-${i}`,
);

// Old enough not to count towards the burst limit, recent enough to be this month (unless the
// month started less than an hour ago, which the tests accept).
const anHourAgo = sql`now() - interval '1 hour'`;

type GenerationOverrides = {
  userId?: string;
  plan?: "free" | "pro";
  status?: "pending" | "succeeded" | "failed";
  createdAt?: SQL;
};

const addGenerations = (count: number, values: GenerationOverrides) =>
  db.insert(quizGenerations).values(
    Array.from({ length: count }, () => ({
      userId: USER,
      plan: "free" as const,
      status: "succeeded" as const,
      createdAt: anHourAgo,
      ...values,
    })),
  );

const limitError = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => (error instanceof GenerationLimitError ? error.status : error),
  );

const dailyKey = () => `generation-daily:${utcDate()}`;
const guestDailyKey = () => `guest-generation-daily:${utcDate()}`;
const counter = async (key: string) =>
  (await db.select().from(rateLimits).where(eq(rateLimits.key, key)))[0]?.count ?? 0;

beforeEach(async () => {
  await createUsers(USER, ...GUESTS);
  await db.update(users).set({ isAnonymous: true }).where(inArray(users.id, GUESTS));
  // Repeated test runs would otherwise use up the day's shared generation slots.
  await db.delete(rateLimits).where(like(rateLimits.key, "%generation-daily:%"));
});
afterAll(() => deleteUsers(USER, ...GUESTS));

describe("usage service", () => {
  it("counts pending and succeeded generations, not failed ones", async () => {
    const id = await reserveGeneration(USER);
    expect((await getMonthlyUsage(USER)).used).toBe(1);

    await finishGeneration(id, "failed");
    expect((await getMonthlyUsage(USER)).used).toBe(0);

    await finishGeneration(id, "succeeded");
    expect(await getMonthlyUsage(USER)).toEqual({ plan: "free", used: 1, limit: 10 });
  });

  it("stops a Free user at the monthly limit with 403", async () => {
    await addGenerations(PLANS.free.monthlyQuizzes, {});
    expect(await limitError(reserveGeneration(USER))).toBe(403);
  });

  it("gives Pro users the higher limit", async () => {
    await db.update(users).set({ subscribed: true }).where(eq(users.id, USER));
    await addGenerations(PLANS.free.monthlyQuizzes, { plan: "pro" });

    expect(await limitError(reserveGeneration(USER))).toBeNull();
    expect((await getMonthlyUsage(USER)).limit).toBe(PLANS.pro.monthlyQuizzes);
  });

  it("ignores last month's generations and stale pending ones", async () => {
    await addGenerations(PLANS.free.monthlyQuizzes, {
      createdAt: sql`date_trunc('month', now()) - interval '1 day'`,
    });
    await addGenerations(3, { status: "pending", createdAt: sql`now() - interval '6 minutes'` });

    expect((await getMonthlyUsage(USER)).used).toBe(0);
  });

  it("limits bursts with 429, counting failed attempts too", async () => {
    await addGenerations(GENERATION_BURST_LIMIT.max, {
      status: "failed",
      createdAt: sql`now()`,
    });
    expect(await limitError(reserveGeneration(USER))).toBe(429);
  });

  // 20 requests: without the lock, every pooled connection (10) wins the race.
  it("lets only one of many parallel requests take the last slot", async () => {
    await addGenerations(PLANS.free.monthlyQuizzes - 1, {});

    const results = await Promise.all(
      Array.from({ length: 20 }, () => limitError(reserveGeneration(USER))),
    );

    expect(results.filter((status) => status === null)).toHaveLength(1);
    expect(results.filter((status) => status === 403)).toHaveLength(19);
  });

  it("stops everyone at the daily limit with 429, without counting toward the user's quota", async () => {
    await db.insert(rateLimits).values({
      id: crypto.randomUUID(),
      key: dailyKey(),
      count: DAILY_GENERATION_LIMIT,
      lastRequest: Date.now(),
    });

    expect(await limitError(reserveGeneration(USER))).toBe(429);
    expect((await getMonthlyUsage(USER)).used).toBe(0);
  });

  it("doesn't take a daily slot when the user's own limit rejects the request", async () => {
    await addGenerations(PLANS.free.monthlyQuizzes, {});
    expect(await limitError(reserveGeneration(USER))).toBe(403);

    const daily = await db.select().from(rateLimits).where(eq(rateLimits.key, dailyKey()));
    expect(daily).toHaveLength(0);
  });

  it("takes one daily slot per reserved generation", async () => {
    await reserveGeneration(USER);

    const [daily] = await db.select().from(rateLimits).where(eq(rateLimits.key, dailyKey()));
    expect(daily.count).toBe(1);
  });

  it("saves the summed token counts and the last model, also for a failed run", async () => {
    await runGeneration(USER, async (onUsage) => {
      onUsage({ model: "model-a", inputTokens: 1000, outputTokens: 200 });
      onUsage({ model: "model-b", inputTokens: 1500, outputTokens: 300 });
    });
    await runGeneration(USER, async (onUsage) => {
      onUsage({ model: "model-a", inputTokens: 900, outputTokens: 100 });
      throw new Error("invalid quiz");
    }).catch(() => {});

    const rows = await db
      .select({
        status: quizGenerations.status,
        model: quizGenerations.model,
        inputTokens: quizGenerations.inputTokens,
        outputTokens: quizGenerations.outputTokens,
      })
      .from(quizGenerations)
      .where(eq(quizGenerations.userId, USER))
      .orderBy(quizGenerations.id);
    expect(rows).toEqual([
      { status: "succeeded", model: "model-b", inputTokens: 2500, outputTokens: 500 },
      { status: "failed", model: "model-a", inputTokens: 900, outputTokens: 100 },
    ]);
  });
});

describe("guest trial", () => {
  const [GUEST] = GUESTS;

  it("stops a guest after their trial quizzes in total, not per month, failed ones not counted", async () => {
    const lastYear = sql`now() - interval '1 year'`;
    await addGenerations(GUEST_TRIAL.quizzes - 1, { userId: GUEST, createdAt: lastYear });
    await addGenerations(2, { userId: GUEST, status: "failed" });

    await reserveGeneration(GUEST);
    expect(await limitError(reserveGeneration(GUEST))).toBe(403);
  });

  it("shares the daily trial slots between all guests, also when they ask at the same moment", async () => {
    const results = await Promise.all(GUESTS.map((guest) => limitError(reserveGeneration(guest))));

    expect(results.filter((status) => status === null)).toHaveLength(GUEST_TRIAL.dailyQuizzes);
    expect(results.filter((status) => status === 429)).toHaveLength(1);
    // The rejected request rolled back its slot; every reserved one also took a global slot.
    expect(await counter(guestDailyKey())).toBe(GUEST_TRIAL.dailyQuizzes);
    expect(await counter(dailyKey())).toBe(GUEST_TRIAL.dailyQuizzes);
  });

  it("gives the guest slot back when the global daily limit stops the request", async () => {
    await db.insert(rateLimits).values({
      id: crypto.randomUUID(),
      key: dailyKey(),
      count: DAILY_GENERATION_LIMIT,
      lastRequest: Date.now(),
    });

    expect(await limitError(reserveGeneration(GUEST))).toBe(429);
    expect(await counter(guestDailyKey())).toBe(0);
  });

  it("leaves the trial slots to guests", async () => {
    await reserveGeneration(USER);

    expect(await counter(guestDailyKey())).toBe(0);
    expect(await counter(dailyKey())).toBe(1);
  });

  it("reports the trial quizzes a guest has used, of any month", async () => {
    await addGenerations(1, { userId: GUEST, createdAt: sql`now() - interval '1 year'` });
    await addGenerations(1, { userId: GUEST, status: "failed" });
    await reserveGeneration(GUEST);

    expect(await getTrialUsage(GUEST)).toEqual({ used: 2, limit: GUEST_TRIAL.quizzes });
  });
});
