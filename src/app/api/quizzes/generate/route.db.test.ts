import { eq, like } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { courses, quizGenerations, quizzes, rateLimits } from "@/db/schema";
import { DEFAULT_QUESTION_COUNT, PLANS } from "@/lib/plans";
import { getMonthlyUsage } from "@/server/services/usage";
import { createUsers, deleteUsers } from "@/test/db-fixtures";
import { model, modelResponse, resetModel } from "@/test/gemini-mock";
import { generatedQuiz } from "@/test/generated-quiz";
import { makePdf } from "@/test/make-pdf";
import { POST } from "./route";

const USER = "generate-route-db-test-user";

const session = vi.hoisted(() => ({ signedIn: true }));
vi.mock("@/server/session", () => ({
  getCurrentUser: async () =>
    session.signedIn ? { id: USER, name: "Test", email: "t@example.com", image: null } : null,
}));
vi.mock("@langchain/google/node", () => import("@/test/gemini-mock"));

const generate = async (
  file: Blob | null,
  questionCount: number | null = DEFAULT_QUESTION_COUNT,
) => {
  const form = new FormData();
  if (file) form.set("pdf", file, "cells.pdf");
  if (questionCount !== null) form.set("questionCount", String(questionCount));
  const response = await POST(
    new Request("http://localhost/api/quizzes/generate", { method: "POST", body: form }),
  );
  return {
    status: response.status,
    body: (await response.json()) as { quizId?: number; error?: string },
  };
};

beforeEach(async () => {
  await createUsers(USER);
  // Repeated test runs would otherwise use up the day's shared generation slots.
  await db.delete(rateLimits).where(like(rateLimits.key, "generation-daily:%"));
  session.signedIn = true;
  resetModel();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(() => deleteUsers(USER));

describe("POST /api/quizzes/generate", () => {
  it("saves a 10-question quiz with explanations in the user's default course", async () => {
    model.invoke.mockResolvedValue(modelResponse(generatedQuiz(DEFAULT_QUESTION_COUNT)));

    const response = await generate(makePdf(["Mitochondria make energy."]));

    expect(response.status).toBe(201);
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

  it("asks the AI for the chosen number of questions", async () => {
    model.invoke.mockResolvedValue(modelResponse(generatedQuiz(15)));

    const response = await generate(makePdf(["Mitochondria make energy."]), 15);

    expect(response.status).toBe(201);
    const [system] = model.invoke.mock.calls[0][0] as { content: string }[];
    expect(system.content).toContain("Write exactly 15 questions.");
  });

  it("refuses counts nobody offers and counts above the plan before calling the AI", async () => {
    const pdf = makePdf(["Text."]);
    expect((await generate(pdf, null)).status).toBe(400);
    expect((await generate(pdf, 7)).status).toBe(400);
    const tooMany = await generate(pdf, PLANS.pro.questionCounts.at(-1));
    expect(tooMany.status).toBe(403);
    expect(tooMany.body.error).toContain("part of Pro");
    expect(model.invoke).not.toHaveBeenCalled();
    expect((await getMonthlyUsage(USER)).used).toBe(0);
  });

  it("refuses signed-out users, non-PDF files and unusable PDFs before calling the AI", async () => {
    expect((await generate(makePdf([""]))).status).toBe(422);
    const damaged = await generate(new Blob(["%PDF-1.4 broken"]));
    expect(damaged.status).toBe(422);
    expect(damaged.body.error).toContain("damaged or password-protected");
    expect((await generate(new Blob(["not a pdf"]))).status).toBe(400);
    const notFormData = await POST(
      new Request("http://localhost/api/quizzes/generate", { method: "POST", body: "{}" }),
    );
    expect(notFormData.status).toBe(400);
    session.signedIn = false;
    expect((await generate(makePdf(["Text."]))).status).toBe(401);
    // Signed out comes first, so the file isn't even looked at.
    expect((await generate(new Blob(["not a pdf"]))).status).toBe(401);
    expect(model.invoke).not.toHaveBeenCalled();
  });

  it("doesn't count a quiz with too few questions toward the monthly quota", async () => {
    model.invoke.mockResolvedValue(modelResponse(generatedQuiz(DEFAULT_QUESTION_COUNT - 3)));

    const response = await generate(makePdf(["Text."]));

    expect(response.status).toBe(502);
    expect(response.body.error).toContain("Please try again");
    expect((await getMonthlyUsage(USER)).used).toBe(0);
    const [attempt] = await db
      .select()
      .from(quizGenerations)
      .where(eq(quizGenerations.userId, USER));
    // Both models were tried; the tokens of both calls are saved.
    expect(attempt).toMatchObject({ status: "failed", inputTokens: 2000, outputTokens: 600 });
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
