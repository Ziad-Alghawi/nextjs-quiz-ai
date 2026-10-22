import { describe, expect, it } from "vitest";
import { courseNameSchema } from "./course";

describe("courseNameSchema", () => {
  it.each(["My quizzes", "  my QUIZZES "])("keeps %j for the quick quiz folder", (name) => {
    const result = courseNameSchema.safeParse(name);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("folder for your quick quizzes");
  });

  it("accepts other names, trimmed", () => {
    expect(courseNameSchema.parse("  My quizzes 2 ")).toBe("My quizzes 2");
  });
});
