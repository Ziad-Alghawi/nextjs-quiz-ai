// Integration tests that need a migrated Postgres (locally: npm run db:up && npm run db:migrate).
import { defineConfig } from "vitest/config";
import unitConfig from "./vitest.config.mts";

export default defineConfig({
  resolve: unitConfig.resolve,
  test: {
    include: ["src/**/*.db.test.ts"],
    // The same test env as the unit tests instead of .env, so local runs match CI (which has no .env).
    env: unitConfig.test?.env,
    // The tests share one database.
    fileParallelism: false,
  },
});
