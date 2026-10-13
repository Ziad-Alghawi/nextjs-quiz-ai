import { afterEach, describe, expect, it, vi } from "vitest";

// env.ts validates when it is imported, so each test imports a fresh copy. The valid baseline comes
// from test.env in vitest.config.mts; each test changes only the variables it is about.
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
    const env = await importEnv({ APP_URL: "http://localhost:3000/" });
    expect(env.DATABASE_URL).toBe(process.env.DATABASE_URL);
    expect(env.APP_URL).toBe("http://localhost:3000");
  });

  it("names every missing or invalid variable without printing values", async () => {
    const error = await importEnv({
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
      importEnv({ GEMINI_API_KEY: undefined, SKIP_ENV_VALIDATION: "true" }),
    ).resolves.toBeDefined();
  });

  it("prints emails to the console unless SMTP is configured", async () => {
    const env = await importEnv({ EMAIL_TRANSPORT: undefined });
    expect(env.EMAIL_TRANSPORT).toBe("console");
  });

  it("requires the SMTP settings when EMAIL_TRANSPORT is smtp", async () => {
    const error = await importEnv({
      EMAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.gmail.com",
      SKIP_ENV_VALIDATION: undefined,
    }).catch((e: Error) => e);

    expect((error as Error).message).toMatch(/SMTP_PORT/);
    expect((error as Error).message).toMatch(/EMAIL_FROM/);
  });
});
