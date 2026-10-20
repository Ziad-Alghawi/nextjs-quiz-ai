import { describe, expect, it } from "vitest";
import { examPaper } from "./exam";

const quiz = {
  id: 7,
  name: "Exam: Biology",
  kind: "exam",
  courseId: 3,
  questions: [
    {
      id: 1,
      questionText: "Where is DNA stored?",
      explanation: "The nucleus holds the chromosomes.",
      answers: [
        { id: 10, answerText: "Nucleus", isCorrect: true },
        { id: 11, answerText: "Ribosome", isCorrect: false },
      ],
    },
  ],
};

describe("examPaper", () => {
  it("keeps only the questions and options, in their order", () => {
    expect(examPaper(quiz)).toStrictEqual({
      id: 7,
      name: "Exam: Biology",
      questions: [
        {
          id: 1,
          questionText: "Where is DNA stored?",
          answers: [
            { id: 10, answerText: "Nucleus" },
            { id: 11, answerText: "Ribosome" },
          ],
        },
      ],
    });
  });

  it("sends nothing that gives the correct answer away", () => {
    const sent = JSON.stringify(examPaper(quiz));

    expect(sent).not.toContain("isCorrect");
    expect(sent).not.toContain("explanation");
    expect(sent).not.toContain("nucleus holds");
  });
});
