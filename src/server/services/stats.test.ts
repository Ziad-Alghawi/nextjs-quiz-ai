import { describe, expect, it } from "vitest";
import { summarizeActivity } from "./stats";

const days = (...dates: string[]) => dates.map((date) => ({ date, count: 1 }));

describe("summarizeActivity", () => {
  it("returns zeros without activity", () => {
    expect(summarizeActivity([], "2026-10-15")).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      attemptsThisMonth: 0,
    });
  });

  it("counts the streak up to today", () => {
    const activity = days("2026-10-13", "2026-10-14", "2026-10-15");
    expect(summarizeActivity(activity, "2026-10-15").currentStreak).toBe(3);
  });

  it("keeps the streak alive when today has no attempt yet", () => {
    const activity = days("2026-10-13", "2026-10-14");
    expect(summarizeActivity(activity, "2026-10-15").currentStreak).toBe(2);
  });

  it("ends the streak after a missed day", () => {
    const activity = days("2026-10-10", "2026-10-11", "2026-10-13");
    const summary = summarizeActivity(activity, "2026-10-15");
    expect(summary.currentStreak).toBe(0);
    expect(summary.longestStreak).toBe(2);
  });

  it("finds the longest streak across month and year boundaries", () => {
    const activity = days("2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-03-01");
    expect(summarizeActivity(activity, "2026-10-15").longestStreak).toBe(4);
  });

  it("sums only the current month, several attempts a day included", () => {
    const activity = [
      { date: "2026-09-30", count: 4 },
      { date: "2026-10-02", count: 2 },
      { date: "2026-10-15", count: 3 },
    ];
    expect(summarizeActivity(activity, "2026-10-15").attemptsThisMonth).toBe(5);
  });
});
