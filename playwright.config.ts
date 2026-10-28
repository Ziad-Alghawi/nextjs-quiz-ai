import { defineConfig, devices } from "@playwright/test";
import { E2E_DATABASE_URL } from "./e2e/db";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    // Signs in the shared account once; specs that need it start from the saved session.
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
  ],
  webServer: {
    // A production build, as users get it, on its own port and database so it can't clash with
    // `npm run dev`. The database is recreated first, so every run starts without accounts.
    command: `node e2e/reset-db.ts && node scripts/migrate.ts && npm run build && npm run start -- --port ${PORT}`,
    url: `${baseURL}/api/health`,
    timeout: 5 * 60_000,
    // Process variables win over .env, so nothing from a local .env (real keys, SMTP) is used.
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: "e2e-secret-used-only-by-the-end-to-end-tests",
      GOOGLE_CLIENT_ID: "e2e-client-id",
      GOOGLE_CLIENT_SECRET: "e2e-client-secret",
      // Invalid on purpose: a test that reaches Gemini or Stripe fails instead of costing money.
      GEMINI_API_KEY: "e2e-invalid-key",
      STRIPE_SECRET_KEY: "sk_test_e2e_invalid",
      STRIPE_WEBHOOK_SECRET: "whsec_e2e",
      STRIPE_PRICE_ID: "price_e2e_month",
      STRIPE_YEARLY_PRICE_ID: "price_e2e_year",
      APP_URL: baseURL,
      EMAIL_TRANSPORT: "console",
      CRON_SECRET: "e2e-cron-secret-with-at-least-32-characters",
    },
  },
});
