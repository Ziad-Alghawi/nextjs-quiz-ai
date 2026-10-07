// Integration tests that need a migrated Postgres (locally: npm run db:up && npm run db:migrate).
import "dotenv/config";
import { defineConfig } from "vitest/config";
import unitConfig from "./vitest.config.mts";

export default defineConfig({
  resolve: unitConfig.resolve,
  test: {
    include: ["src/**/*.db.test.ts"],
    // The tests share one database.
    fileParallelism: false,
  },
});
