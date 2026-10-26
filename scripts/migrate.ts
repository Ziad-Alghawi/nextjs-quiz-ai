// Applies the committed migrations in drizzle/ for the migrations container (compose, Kubernetes Job).
// `drizzle-kit migrate` calls this same migrate() with the same history table (drizzle.__drizzle_migrations),
// so both share one record; the image just leaves out drizzle-kit and its bundled esbuild binaries.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { z } from "zod";

const databaseUrl = z.url().parse(process.env.DATABASE_URL);
// Notices like "schema drizzle already exists, skipping" on every rerun are expected, not worth logging.
const client = postgres(databaseUrl, { max: 1, connect_timeout: 10, onnotice: () => {} });

try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
} finally {
  await client.end();
}
