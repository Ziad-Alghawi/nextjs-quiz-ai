import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";

describe("database schema", () => {
  // A table without RLS would be readable through Supabase's Data API if it were turned on again.
  it("enables row-level security on every table in public", async () => {
    const tables = await db.execute<{ tablename: string }>(
      sql`select tablename from pg_tables where schemaname = 'public' and not rowsecurity`,
    );

    expect(tables.map((table) => table.tablename)).toEqual([]);
  });
});
