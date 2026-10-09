import { afterEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

// The transport is chosen when the module loads, so each test imports a fresh copy.
const importMail = async (vars: Record<string, string | undefined>) => {
  vi.resetModules();
  for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value);
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
