import { sql } from "drizzle-orm";
import { db } from "./index";

export async function pingDatabase(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch (error) {
    console.error("Database ping failed", error);
    return false;
  }
}
