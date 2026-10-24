import { describe, expect, it } from "vitest";
import { utcDate } from "./time";

describe("utcDate", () => {
  it("formats the UTC day, not the local one", () => {
    expect(utcDate(new Date("2026-10-25T23:59:59.999Z"))).toBe("2026-10-25");
    expect(utcDate(new Date("2026-10-26T00:00:00.000Z"))).toBe("2026-10-26");
  });
});
