import { describe, expect, it } from "vitest";
import { pickReviewQuestions, reviewName } from "./review";

const quiz = (name: string, size: number) =>
  Array.from({ length: size }, (_, index) => `${name}${index + 1}`);

const perQuiz = (picked: string[]) =>
  picked.reduce<Record<string, number>>((counts, question) => {
    counts[question[0]] = (counts[question[0]] ?? 0) + 1;
    return counts;
  }, {});

describe("pickReviewQuestions", () => {
  it("spreads the questions evenly over the quizzes", () => {
    for (let run = 0; run < 20; run++) {
      const picked = pickReviewQuestions([quiz("a", 10), quiz("b", 10), quiz("c", 10)], 10);
      expect(picked).toHaveLength(10);
      expect(Object.values(perQuiz(picked)).sort()).toEqual([3, 3, 4]);
    }
  });

  it("gives the extra question to a different quiz across runs", () => {
    const withExtra = new Set<string>();
    for (let run = 0; run < 50; run++) {
      const counts = perQuiz(pickReviewQuestions([quiz("a", 10), quiz("b", 10)], 5));
      withExtra.add(counts.a === 3 ? "a" : "b");
    }
    expect(withExtra).toEqual(new Set(["a", "b"]));
  });

  it("moves the share of a short quiz to the others", () => {
    const picked = pickReviewQuestions([quiz("a", 2), quiz("b", 10), quiz("c", 10)], 15);
    expect(perQuiz(picked)).toEqual({ a: 2, b: expect.any(Number), c: expect.any(Number) });
    expect(picked).toHaveLength(15);
    expect(new Set(picked).size).toBe(15);
  });

  it("returns every question when there are fewer than asked", () => {
    const picked = pickReviewQuestions([quiz("a", 2), quiz("b", 3)], 10);
    expect([...picked].sort()).toEqual(["a1", "a2", "b1", "b2", "b3"]);
  });

  it("does not change the input", () => {
    const quizzes = [quiz("a", 5), quiz("b", 5)];
    pickReviewQuestions(quizzes, 5);
    expect(quizzes).toEqual([quiz("a", 5), quiz("b", 5)]);
  });
});

describe("reviewName", () => {
  it("names both quizzes when there are two", () => {
    expect(reviewName(["Cells", "Genetics"])).toBe("Review: Cells, Genetics");
  });

  it("names the first and counts the rest", () => {
    expect(reviewName(["Cells", "Genetics", "Evolution"])).toBe("Review: Cells + 2 more");
  });
});
