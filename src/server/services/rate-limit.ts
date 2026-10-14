import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Counts one attempt for `key` and says whether it is within `max` attempts per window. Rejected
 * attempts count too. A fixed window on Better Auth's rate-limit table (its keys are "ip|path", ours
 * have a prefix, so they never collide): `last_request` holds the window's start, and one upsert
 * counts the attempt, so parallel requests can't slip past the limit.
 */
export async function consumeRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const windowOver = sql`${rateLimits.lastRequest} < ${now - windowMs}`;
  const [{ count }] = await db
    .insert(rateLimits)
    .values({ id: crypto.randomUUID(), key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${windowOver} THEN 1 ELSE ${rateLimits.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${windowOver} THEN ${now} ELSE ${rateLimits.lastRequest} END`,
      },
    })
    .returning({ count: rateLimits.count });
  return count <= max;
}
