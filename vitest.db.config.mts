// Integration tests that need a migrated Postgres (locally: npm run db:up && npm run db:migrate).
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next.js resolves "server-only" itself; outside Next it is an empty module.
      "server-only": fileURLToPath(
        new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.db.test.ts"],
    // The tests share one database.
    fileParallelism: false,
  },
});
