import { describe, expect, it } from "vitest";
import { pluralize } from "./pluralize";

describe("pluralize", () => {
  it("uses the singular only for exactly one", () => {
    expect([0, 1, 2].map((n) => pluralize(n, "day"))).toEqual(["0 days", "1 day", "2 days"]);
  });

  it("takes an irregular plural", () => {
    expect(pluralize(3, "quiz", "quizzes")).toBe("3 quizzes");
  });
});
