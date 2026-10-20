import { describe, expect, it } from "vitest";
import { idSchema } from "./id";

describe("idSchema", () => {
  it.each([
    ["42", 42],
    ["2147483647", 2147483647],
  ])("accepts %j from a URL segment", (input, id) => {
    expect(idSchema.parse(input)).toBe(id);
  });

  it.each(["abc", "12abc", "0", "-3", "1.5", "", "2147483648", "99999999999"])(
    "rejects %j",
    (input) => {
      expect(idSchema.safeParse(input).success).toBe(false);
    },
  );
});
