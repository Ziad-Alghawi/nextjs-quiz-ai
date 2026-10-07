import { eq, sql, type SQL } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { quizGenerations, users } from "@/db/schema";
import { GENERATION_BURST_LIMIT, PLANS } from "@/lib/plans";
import {
  finishGeneration,
  GenerationLimitError,
  getMonthlyUsage,
  reserveGeneration,
} from "./usage";

const USER = "usage-db-test-user";

// Old enough not to count towards the burst limit, recent enough to be this month (unless the
// month started less than an hour ago, which the tests accept).
const anHourAgo = sql`now() - interval '1 hour'`;

type GenerationOverrides = {
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

beforeEach(async () => {
  await db.delete(users).where(eq(users.id, USER)); // cascades to its generations
  await db.insert(users).values({ id: USER, email: `${USER}@example.com`, subscribed: false });
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, USER));
});

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
    await addGenerations(GENERATION_BURST_LIMIT.attempts, {
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
});
