// Recreates the end-to-end test database before the test server starts, so every run begins without
// accounts from earlier runs and without their rate-limit counters (sign-up allows 5 per hour per IP).
import postgres from "postgres";
import { z } from "zod";

const url = new URL(z.url().parse(process.env.DATABASE_URL));
const name = url.pathname.slice(1);
// The database is dropped, so refuse anything that isn't clearly the test one.
if (!name.endsWith("_e2e")) throw new Error(`Refusing to reset "${name}": not an _e2e database.`);

// A database can't be dropped while connected to it, so connect to the server's default one.
url.pathname = "/postgres";
const sql = postgres(url.href, { max: 1, connect_timeout: 10, onnotice: () => {} });

try {
  await sql`drop database if exists ${sql(name)} with (force)`;
  await sql`create database ${sql(name)}`;
} finally {
  await sql.end();
}
