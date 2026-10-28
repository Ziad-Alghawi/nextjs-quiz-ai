import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import { env } from "@/lib/env";
import { createUsers, deleteUsers } from "@/test/db-fixtures";
import { GET } from "./route";

const GUEST = "cleanup-route-db-test-guest";
const SECRET = "a-cron-secret-of-at-least-32-characters";

// The route reads the secret from the validated env when called, so the tests set it there.
const original = env.CRON_SECRET;

const call = async (authorization?: string) => {
  const response = await GET(
    new Request("http://localhost/api/cron/cleanup-guests", {
      headers: authorization ? { authorization } : {},
    }),
  );
  return { status: response.status, body: (await response.json()) as { deleted?: number } };
};
const guestExists = async () =>
  (await db.select().from(users).where(eq(users.id, GUEST))).length === 1;

beforeEach(async () => {
  await createUsers(GUEST);
  await db
    .update(users)
    .set({ isAnonymous: true, createdAt: sql`now() - interval '8 days'` })
    .where(eq(users.id, GUEST));
  env.CRON_SECRET = SECRET;
});
afterAll(async () => {
  env.CRON_SECRET = original;
  await deleteUsers(GUEST);
});

describe("GET /api/cron/cleanup-guests", () => {
  it("deletes expired guests with the right secret and says how many", async () => {
    const response = await call(`Bearer ${SECRET}`);

    expect(response.status).toBe(200);
    expect(response.body.deleted).toBeGreaterThanOrEqual(1);
    expect(await guestExists()).toBe(false);
  });

  it("refuses a missing or wrong secret, and deletes nothing", async () => {
    for (const header of [undefined, SECRET, `Bearer ${SECRET}x`, `Bearer ${"x".repeat(39)}`]) {
      expect((await call(header)).status).toBe(401);
    }
    expect(await guestExists()).toBe(true);
  });

  it("stays off when CRON_SECRET isn't set", async () => {
    for (const unset of [undefined, ""]) {
      env.CRON_SECRET = unset;
      expect((await call("Bearer ")).status).toBe(401);
      expect((await call(`Bearer ${unset}`)).status).toBe(401);
    }
    expect(await guestExists()).toBe(true);
  });
});
