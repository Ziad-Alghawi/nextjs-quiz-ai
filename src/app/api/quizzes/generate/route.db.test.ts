import { eq, like } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { courses, quizGenerations, quizzes, rateLimits, users } from "@/db/schema";
import { DEFAULT_QUESTION_COUNT, PLANS } from "@/lib/plans";
import type { GeneratedQuiz } from "@/lib/validations/quiz";
import { getMonthlyUsage } from "@/server/services/usage";
import { modelResponse } from "@/test/model-response";
import { makePdf } from "@/test/make-pdf";
import { POST } from "./route";

const USER = "generate-route-db-test-user";

const session = vi.hoisted(() => ({ signedIn: true }));
vi.mock("@/server/session", () => ({
  getCurrentUser: async () =>
    session.signedIn ? { id: USER, name: "Test", email: "t@example.com", image: null } : null,
}));
// No real Gemini calls in tests: the structured-output model is replaced by this mock.
const model = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@langchain/google/node", () => ({
  ChatGoogle: class {
    withStructuredOutput() {
      return model;
    }
  },
}));

const generated = (questionCount: number): GeneratedQuiz => ({
  name: "Cells",
  description: "Parts of a cell.",
  questions: Array.from({ length: questionCount }, (_, i) => ({
    questionText: `Question ${i + 1}?`,
    explanation: `Explanation ${i + 1}.`,
    answers: [
      { answerText: "Right", isCorrect: true },
      { answerText: "Wrong", isCorrect: false },
    ],
  })),
});

const generate = async (file: Blob | null) => {
  const form = new FormData();
  if (file) form.set("pdf", file, "cells.pdf");
  const response = await POST(
    new NextRequest("http://localhost/api/quizzes/generate", { method: "POST", body: form }),
  );
  return {
    status: response.status,
    body: (await response.json()) as { quizId?: number; error?: string },
  };
};

const cleanUp = () => db.delete(users).where(eq(users.id, USER));

beforeEach(async () => {
  await cleanUp();
  // Repeated test runs would otherwise use up the day's shared generation slots.
  await db.delete(rateLimits).where(like(rateLimits.key, "generation-daily:%"));
  await db.insert(users).values({ id: USER, name: "Test", email: `${USER}@example.com` });
  session.signedIn = true;
  model.invoke.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(cleanUp);

describe("POST /api/quizzes/generate", () => {
  it("saves a 10-question quiz with explanations in the user's default course", async () => {
    model.invoke.mockResolvedValue(modelResponse(generated(DEFAULT_QUESTION_COUNT)));

    const response = await generate(makePdf(["Mitochondria make energy."]));

    expect(response.status).toBe(200);
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, response.body.quizId!),
      with: { questions: { with: { answers: true } } },
    });
    expect(quiz?.questions).toHaveLength(DEFAULT_QUESTION_COUNT);
    expect(quiz?.questions.map((q) => q.explanation)).toContain("Explanation 1.");
    const [system, human] = model.invoke.mock.calls[0][0] as { content: string }[];
    expect(system.content).toContain(`Write exactly ${DEFAULT_QUESTION_COUNT} questions.`);
    expect(human.content).toContain('<document title="cells.pdf">');
    const [course] = await db.select().from(courses).where(eq(courses.id, quiz!.courseId));
    expect(course).toMatchObject({ userId: USER, name: "My quizzes" });
    expect((await getMonthlyUsage(USER)).used).toBe(1);
    const [generation] = await db
      .select()
      .from(quizGenerations)
      .where(eq(quizGenerations.userId, USER));
    expect(generation).toMatchObject({ inputTokens: 1000, outputTokens: 300 });
    expect(generation.model).toMatch(/^gemini-/);
  });

  it("refuses signed-out users, non-PDF files and PDFs without text before calling the AI", async () => {
    expect((await generate(makePdf([""]))).status).toBe(422);
    expect((await generate(new Blob(["not a pdf"]))).status).toBe(400);
    session.signedIn = false;
    expect((await generate(makePdf(["Text."]))).status).toBe(401);
    expect(model.invoke).not.toHaveBeenCalled();
  });

  it("doesn't count a quiz with too few questions toward the monthly quota", async () => {
    model.invoke.mockResolvedValue(modelResponse(generated(DEFAULT_QUESTION_COUNT - 3)));

    const response = await generate(makePdf(["Text."]));

    expect(response.status).toBe(502);
    expect(response.body.error).toContain("Please try again");
    expect((await getMonthlyUsage(USER)).used).toBe(0);
    const [attempt] = await db
      .select()
      .from(quizGenerations)
      .where(eq(quizGenerations.userId, USER));
    expect(attempt.status).toBe("failed");
  });

  it("stops at the monthly quota without calling the AI", async () => {
    await db.insert(quizGenerations).values(
      Array.from({ length: PLANS.free.monthlyQuizzes }, () => ({
        userId: USER,
        plan: "free" as const,
        status: "succeeded" as const,
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      })),
    );

    const response = await generate(makePdf(["Text."]));

    expect(response.status).toBe(403);
    expect(model.invoke).not.toHaveBeenCalled();
  });
});
