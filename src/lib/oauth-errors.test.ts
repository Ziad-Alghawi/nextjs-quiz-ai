import { describe, expect, it } from "vitest";
import { googleErrorMessage } from "./oauth-errors";

describe("googleErrorMessage", () => {
  it("explains why Google wasn't linked to an existing password account", () => {
    expect(googleErrorMessage("account_not_linked")).toMatch(/connect Google in Settings/);
  });

  it.each(["access_denied", "constructor", "", undefined])(
    "falls back to a generic message for %j",
    (code) => {
      expect(googleErrorMessage(code)).toBe("Signing in with Google failed. Please try again.");
    },
  );
});
