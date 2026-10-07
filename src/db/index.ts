import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres";

const client = postgres(connectionString, {
  // Fail fast when the database is unreachable (e.g. a paused Supabase project); the default is 30 s.
  connect_timeout: 10,
  // Supabase's transaction pooler (port 6543) can't keep prepared statements between transactions.
  prepare: false,
});
export const db = drizzle(client, { schema });
