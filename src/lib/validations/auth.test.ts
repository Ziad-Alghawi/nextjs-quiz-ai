import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  PASSWORD_MIN_LENGTH,
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
