import { afterEach, describe, expect, it, vi } from "vitest";

const validEnv = {
  DATABASE_URL: "postgres://quiz_ai:quiz_ai@localhost:5432/quiz_ai",
  AUTH_SECRET: "secret",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GEMINI_API_KEY: "gemini-key",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  STRIPE_PRICE_ID: "price_123",
  APP_URL: "http://localhost:3000/",
};

// env.ts validates when it is imported, so each test imports a fresh copy.
const importEnv = async (vars: Record<string, string | undefined>) => {
  vi.resetModules();
  for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value);
  return (await import("./env")).env;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("env", () => {
  it("returns the validated variables", async () => {
    const env = await importEnv(validEnv);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("names every missing or invalid variable without printing values", async () => {
    const error = await importEnv({
      ...validEnv,
      DATABASE_URL: "not a url",
      GEMINI_API_KEY: undefined,
      SKIP_ENV_VALIDATION: undefined,
    }).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/DATABASE_URL/);
    expect((error as Error).message).toMatch(/GEMINI_API_KEY/);
    expect((error as Error).message).not.toMatch(/not a url/);
  });

  it("does not throw when validation is skipped for builds", async () => {
    await expect(
      importEnv({ ...validEnv, GEMINI_API_KEY: undefined, SKIP_ENV_VALIDATION: "true" }),
    ).resolves.toBeDefined();
  });
});
