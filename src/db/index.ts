import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/postgres";

// Fail fast when the database is unreachable (e.g. a paused Supabase project); the default is 30 s.
const client = postgres(connectionString, { connect_timeout: 10 });
export const db = drizzle(client, { schema });
