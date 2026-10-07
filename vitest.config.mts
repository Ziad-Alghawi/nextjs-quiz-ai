import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Same alias as tsconfig.json, so tests can import modules the way the app does.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next.js resolves "server-only" itself; outside Next it is an empty module.
      "server-only": fileURLToPath(
        new URL("./node_modules/next/dist/compiled/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    // Database tests run separately with npm run test:db (vitest.db.config.mts).
    exclude: ["src/**/*.db.test.ts"],
  },
});
