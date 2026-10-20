import { describe, expect, it } from "vitest";
import { missedQuestions, shuffleRound } from "./practice";

const questions = [1, 2, 3].map((id) => ({
  id,
  answers: [
    { id: id * 10 + 1, isCorrect: true },
    { id: id * 10 + 2, isCorrect: false },
  ],
}));

describe("missedQuestions", () => {
  it("returns the wrong and unanswered questions in their original order", () => {
    const missed = missedQuestions(questions, [
      { questionId: 3, answerId: 32 },
      { questionId: 2, answerId: 21 },
    ]);
    expect(missed.map((question) => question.id)).toEqual([1, 3]);
  });

  it("only counts the first answer per question", () => {
    const missed = missedQuestions(questions, [
      { questionId: 1, answerId: 12 },
      { questionId: 1, answerId: 11 },
      { questionId: 2, answerId: 21 },
      { questionId: 3, answerId: 31 },
    ]);
    expect(missed.map((question) => question.id)).toEqual([1]);
  });

  it("doesn't count another question's correct answer", () => {
    expect(missedQuestions(questions.slice(0, 1), [{ questionId: 1, answerId: 21 }])).toHaveLength(
      1,
    );
  });
});

describe("shuffleRound", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    answers: [0, 1, 2, 3, 4, 5].map((n) => ({ id: i * 10 + n })),
  }));
  const ids = (items: { id: number }[]) => items.map((item) => item.id);

  it("keeps every question and every option", () => {
    const round = shuffleRound(many);
    expect(ids(round).sort((a, b) => a - b)).toEqual(ids(many));
    for (const question of round) {
      expect(ids(question.answers).sort((a, b) => a - b)).toEqual(ids(many[question.id].answers));
    }
  });

  it("changes the order of the questions and of the options", () => {
    // 30! and 6!^30 orders: an unchanged result would mean no shuffling.
    const round = shuffleRound(many);
    expect(ids(round)).not.toEqual(ids(many));
    expect(
      round.some(
        (question) => ids(question.answers).join() !== ids(many[question.id].answers).join(),
      ),
    ).toBe(true);
  });

  it("doesn't change the input", () => {
    const copy = structuredClone(many);
    shuffleRound(many);
    expect(many).toEqual(copy);
  });
});
