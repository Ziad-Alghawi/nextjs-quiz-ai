import { describe, expect, it } from "vitest";
import { scoreAttempt } from "./scoring";

const questions = [
  {
    id: 1,
    answers: [
      { id: 11, isCorrect: true },
      { id: 12, isCorrect: false },
    ],
  },
  {
    id: 2,
    answers: [
      { id: 21, isCorrect: false },
      { id: 22, isCorrect: true },
    ],
  },
];

describe("scoreAttempt", () => {
  it("counts correctly answered questions", () => {
    expect(
      scoreAttempt(questions, [
        { questionId: 1, answerId: 11 },
        { questionId: 2, answerId: 21 },
      ]),
    ).toEqual({
      score: 1,
      total: 2,
      complete: true,
      answers: [
        { questionId: 1, answerId: 11 },
        { questionId: 2, answerId: 21 },
      ],
    });
  });

  it("reports an incomplete attempt when a question has no answer", () => {
    expect(scoreAttempt(questions, [{ questionId: 1, answerId: 11 }])).toEqual({
      score: 1,
      total: 2,
      complete: false,
      answers: [{ questionId: 1, answerId: 11 }],
    });
  });

  it("only counts the first answer per question", () => {
    const { score, answers } = scoreAttempt(questions, [
      { questionId: 1, answerId: 12 },
      { questionId: 1, answerId: 11 },
    ]);
    expect(score).toBe(0);
    expect(answers).toEqual([{ questionId: 1, answerId: 12 }]);
  });

  it("ignores answers that belong to another question", () => {
    expect(
      scoreAttempt(questions, [
        { questionId: 1, answerId: 22 },
        { questionId: 2, answerId: 22 },
      ]),
    ).toEqual({ score: 1, total: 2, complete: false, answers: [{ questionId: 2, answerId: 22 }] });
  });
});
