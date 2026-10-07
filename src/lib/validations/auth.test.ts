import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  confirmEmailChangeSchema,
  fieldErrors,
  PASSWORD_MIN_LENGTH,
  requestEmailChangeSchema,
  resetPasswordSchema,
  safeReturnPath,
  signInSchema,
  signUpSchema,
} from "./auth";

describe("signUpSchema", () => {
  it("accepts a valid registration and trims name and email", () => {
    const result = signUpSchema.parse({
      name: "  Ada  ",
      email: " ada@example.com ",
      password: "correct horse",
    });
    expect(result).toEqual({ name: "Ada", email: "ada@example.com", password: "correct horse" });
  });

  it("reports one message per invalid field", () => {
    const result = signUpSchema.safeParse({
      name: " ",
      email: "not-an-email",
      password: "x".repeat(PASSWORD_MIN_LENGTH - 1),
    });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)).toEqual({
      name: "Enter your name.",
      email: "Enter a valid email address.",
      password: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    });
  });
});

describe("signInSchema", () => {
  it("does not reveal the password rules", () => {
    expect(signInSchema.safeParse({ email: "ada@example.com", password: "short" }).success).toBe(
      true,
    );
  });
});

describe("resetPasswordSchema", () => {
  it("accepts a 6-digit code with surrounding spaces", () => {
    expect(resetPasswordSchema.parse({ otp: " 012345 ", password: "new password" }).otp).toBe(
      "012345",
    );
  });

  it.each(["12345", "1234567", "12345a", ""])("rejects the code %j", (otp) => {
    const result = resetPasswordSchema.safeParse({ otp, password: "new password" });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)).toEqual({ otp: "Enter the 6-digit code from the email." });
  });
});

describe("changePasswordSchema", () => {
  it("checks the new password's rules but not the current one's", () => {
    const result = changePasswordSchema.safeParse({ currentPassword: "old", newPassword: "short" });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)).toEqual({
      newPassword: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    });
  });
});

describe("email change schemas", () => {
  it("trims the new address and uses the same code rules as the password reset", () => {
    expect(requestEmailChangeSchema.parse({ newEmail: " new@example.com " }).newEmail).toBe(
      "new@example.com",
    );
    expect(confirmEmailChangeSchema.safeParse({ otp: "12345" }).success).toBe(false);
    expect(confirmEmailChangeSchema.parse({ otp: "123456" }).otp).toBe("123456");
  });
});

describe("safeReturnPath", () => {
  it("keeps paths on this site", () => {
    expect(safeReturnPath("/quizzes/new")).toBe("/quizzes/new");
  });

  it.each([undefined, null, "", "https://evil.example", "//evil.example", ["/a", "/b"]])(
    "falls back to the dashboard for %j",
    (path) => {
      expect(safeReturnPath(path)).toBe("/dashboard");
    },
  );
});
