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
    // A complete, valid environment, so modules that read env.ts load; tests override single values.
    env: {
      DATABASE_URL: "postgres://quiz_ai:quiz_ai@localhost:5432/quiz_ai",
      AUTH_SECRET: "test-secret",
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      GEMINI_API_KEY: "test-gemini-key",
      STRIPE_SECRET_KEY: "sk_test_123",
      STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
      STRIPE_PRICE_ID: "price_123",
      APP_URL: "http://localhost:3000",
    },
  },
});
