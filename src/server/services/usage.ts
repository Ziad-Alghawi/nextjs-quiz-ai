import "server-only";
import { and, count, eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizGenerations } from "@/db/schema";
import { GENERATION_BURST_LIMIT, PLANS, type PlanId } from "@/lib/plans";
import { isSubscribed } from "./billing";

/** A request that died after reserving (e.g. a timeout) stops holding its slot after this. */
const PENDING_TIMEOUT = sql`interval '5 minutes'`;

export class GenerationLimitError extends Error {
  constructor(
    message: string,
    readonly status: 403 | 429,
  ) {
    super(message);
  }
}

const getPlan = async (userId: string): Promise<PlanId> =>
  (await isSubscribed(userId)) ? "pro" : "free";

// Succeeded generations count; failed ones don't, and pending ones only while still in flight.
const countsTowardQuota = or(
  eq(quizGenerations.status, "succeeded"),
  and(
    eq(quizGenerations.status, "pending"),
    gte(quizGenerations.createdAt, sql`now() - ${PENDING_TIMEOUT}`),
  ),
);

const thisMonth = gte(quizGenerations.createdAt, sql`date_trunc('month', now())`);

/** Generations that count toward this month's quota; also used inside the reserving transaction. */
async function countUsedThisMonth(executor: Pick<typeof db, "select">, userId: string) {
  const [{ used }] = await executor
    .select({ used: count() })
    .from(quizGenerations)
    .where(and(eq(quizGenerations.userId, userId), thisMonth, countsTowardQuota));
  return used;
}

export async function getMonthlyUsage(userId: string) {
  const plan = await getPlan(userId);
  const used = await countUsedThisMonth(db, userId);
  return { plan, used, limit: PLANS[plan].monthlyQuizzes };
}

/**
 * Reserves one generation for the user and returns its id, or throws GenerationLimitError.
 * A per-user advisory lock makes parallel requests queue up, so they can't both take the last slot.
 */
export async function reserveGeneration(userId: string) {
  const plan = await getPlan(userId);
  const { monthlyQuizzes, label } = PLANS[plan];

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);

    if ((await countUsedThisMonth(tx, userId)) >= monthlyQuizzes) {
      const upgrade = plan === "free" ? " Upgrade to Pro for more." : "";
      throw new GenerationLimitError(
        `You've used all ${monthlyQuizzes} quizzes of the ${label} plan this month.${upgrade}`,
        403,
      );
    }

    // Every attempt counts here, failed ones included: each one may have cost a Gemini call.
    const [{ recent }] = await tx
      .select({ recent: count() })
      .from(quizGenerations)
      .where(
        and(
          eq(quizGenerations.userId, userId),
          gte(
            quizGenerations.createdAt,
            sql`now() - make_interval(mins => ${GENERATION_BURST_LIMIT.windowMinutes})`,
          ),
        ),
      );
    if (recent >= GENERATION_BURST_LIMIT.attempts) {
      throw new GenerationLimitError(
        `You can generate up to ${GENERATION_BURST_LIMIT.attempts} quizzes per ${GENERATION_BURST_LIMIT.windowMinutes} minutes. Please wait a few minutes.`,
        429,
      );
    }

    const [{ id }] = await tx
      .insert(quizGenerations)
      .values({ userId, plan })
      .returning({ id: quizGenerations.id });
    return id;
  });
}

export async function finishGeneration(id: number, status: "succeeded" | "failed") {
  await db.update(quizGenerations).set({ status }).where(eq(quizGenerations.id, id));
}
