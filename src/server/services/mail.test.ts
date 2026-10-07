import { afterEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const baseEnv = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  AUTH_SECRET: "secret",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  GEMINI_API_KEY: "key",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  STRIPE_PRICE_ID: "price_123",
  APP_URL: "http://localhost:3000",
};

// The transport is chosen when the module loads, so each test imports a fresh copy.
const importMail = async (vars: Record<string, string | undefined>) => {
  vi.resetModules();
  for (const [name, value] of Object.entries({ ...baseEnv, ...vars })) vi.stubEnv(name, value);
  return import("./mail");
};

const email = { to: "ada@example.com", subject: "Your code", text: "123456" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  sendMail.mockReset();
  createTransport.mockClear();
});

describe("sendEmail", () => {
  it("prints the email to the server log by default", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const { sendEmail } = await importMail({ EMAIL_TRANSPORT: undefined });

    await sendEmail(email);

    expect(log).toHaveBeenCalledWith(expect.stringContaining("123456"));
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("sends through SMTP over TLS when configured", async () => {
    const { sendEmail } = await importMail({
      EMAIL_TRANSPORT: "smtp",
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: "465",
      SMTP_USER: "quizai@gmail.com",
      SMTP_PASSWORD: "app-password",
      EMAIL_FROM: "Quiz AI <quizai@gmail.com>",
    });

    await sendEmail(email);

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.gmail.com", port: 465, secure: true }),
    );
    expect(sendMail).toHaveBeenCalledWith({ from: "Quiz AI <quizai@gmail.com>", ...email });
  });
});
