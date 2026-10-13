import { afterEach, describe, expect, it, vi } from "vitest";
import { shuffle } from "./shuffle";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shuffle", () => {
  it("returns the same items in a new array without changing the input", () => {
    const items = [1, 2, 3, 4];
    const result = shuffle(items);

    expect(result).not.toBe(items);
    expect(items).toEqual([1, 2, 3, 4]);
    expect([...result].sort()).toEqual([1, 2, 3, 4]);
  });

  it("picks each swap with Math.random", () => {
    // Math.random() = 0 swaps each position with index 0, so the first item ends up last.
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(shuffle(["a", "b", "c", "d"])).toEqual(["b", "c", "d", "a"]);

    // Just below 1 keeps every item in place.
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(shuffle(["a", "b", "c", "d"])).toEqual(["a", "b", "c", "d"]);
  });

  it("handles empty and single-item arrays", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["only"])).toEqual(["only"]);
  });
});
