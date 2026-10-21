import { eq, like } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { consumeRateLimit } from "./rate-limit";

const KEY = "rate-limit-db-test:user";
const WINDOW = 60_000;

const cleanUp = () => db.delete(rateLimits).where(like(rateLimits.key, "rate-limit-db-test:%"));
beforeEach(cleanUp);
afterAll(cleanUp);

describe("consumeRateLimit", () => {
  it("allows max attempts per window, also when they arrive in parallel", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumeRateLimit(KEY, 3, WINDOW)),
    );

    expect(results.filter(Boolean)).toHaveLength(3);
    // Rejected attempts count too.
    const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, KEY));
    expect(row.count).toBe(10);
  });

  it("starts a new window once the old one is over", async () => {
    for (let i = 0; i < 4; i++) await consumeRateLimit(KEY, 3, WINDOW);
    expect(await consumeRateLimit(KEY, 3, WINDOW)).toBe(false);

    await db
      .update(rateLimits)
      .set({ lastRequest: Date.now() - WINDOW - 1 })
      .where(eq(rateLimits.key, KEY));
    expect(await consumeRateLimit(KEY, 3, WINDOW)).toBe(true);
  });

  it("counts each key separately", async () => {
    await consumeRateLimit(KEY, 1, WINDOW);
    expect(await consumeRateLimit(`${KEY}-other`, 1, WINDOW)).toBe(true);
  });
});
