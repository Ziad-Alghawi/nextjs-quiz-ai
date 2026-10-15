import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { courses, quizGenerations, quizzes, sources, users } from "@/db/schema";
import { MAX_DOCUMENT_CHARS } from "@/lib/plans";
import type { GeneratedQuiz } from "@/lib/validations/quiz";
import { getMonthlyUsage } from "@/server/services/usage";
import { POST } from "./route";

const USER = "chapter-quiz-db-test-user";
const OTHER_USER = "chapter-quiz-db-test-other";

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

const generate = async (courseId: number | string, body: unknown) => {
  const response = await POST(
    new Request(`http://localhost/api/courses/${courseId}/quizzes`, {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ courseId: String(courseId) }) },
  );
  return {
    status: response.status,
    body: (await response.json()) as { quizId?: number; truncated?: boolean; error?: string },
  };
};

const newCourse = async (userId: string, name = "Biology") => {
  const [course] = await db.insert(courses).values({ userId, name }).returning({ id: courses.id });
  return course.id;
};
const addChapter = async (courseId: number, name: string, text: string) => {
  const [chapter] = await db
    .insert(sources)
    .values({ courseId, name, text, pageCount: 1, sizeBytes: 100 })
    .returning({ id: sources.id });
  return chapter.id;
};

const cleanUp = () => db.delete(users).where(inArray(users.id, [USER, OTHER_USER]));

beforeEach(async () => {
  await cleanUp();
  await db.insert(users).values([
    { id: USER, name: "Test", email: `${USER}@example.com` },
    { id: OTHER_USER, name: "Other", email: `${OTHER_USER}@example.com` },
  ]);
  session.signedIn = true;
  model.invoke.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterAll(cleanUp);

describe("POST /api/courses/[courseId]/quizzes", () => {
  it("saves the quiz in the course, linked to the chapters it was made from", async () => {
    const courseId = await newCourse(USER);
    const cells = await addChapter(courseId, "cells.pdf", "Mitochondria make energy.");
    const genes = await addChapter(courseId, "genes.pdf", "Genes mutate.");
    await addChapter(courseId, "unused.pdf", "Not selected.");
    model.invoke.mockResolvedValue(generated(15));

    const response = await generate(courseId, {
      chapterIds: [genes, cells, genes],
      questionCount: 15,
    });

    expect(response).toEqual({
      status: 201,
      body: { quizId: expect.any(Number), truncated: false },
    });
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, response.body.quizId!),
      with: { questions: true, quizSources: true },
    });
    expect(quiz?.courseId).toBe(courseId);
    expect(quiz?.questions).toHaveLength(15);
    expect(quiz?.quizSources.map((link) => link.sourceId).sort()).toEqual([cells, genes].sort());
    const [system, human] = model.invoke.mock.calls[0][0] as { content: string }[];
    expect(system.content).toContain("Write exactly 15 questions.");
    expect(human.content).toBe(
      '<document title="cells.pdf">\nMitochondria make energy.\n</document>\n\n' +
        '<document title="genes.pdf">\nGenes mutate.\n</document>',
    );
    expect((await getMonthlyUsage(USER)).used).toBe(1);
  });

  it("shares the text limit between the chapters and says when it shortened them", async () => {
    const courseId = await newCourse(USER);
    const short = await addChapter(courseId, "short.pdf", "short ".repeat(1_000));
    const long = await addChapter(courseId, "long.pdf", "long ".repeat(30_000));
    model.invoke.mockResolvedValue(generated(10));

    const response = await generate(courseId, { chapterIds: [short, long], questionCount: 10 });

    expect(response.body.truncated).toBe(true);
    const [, human] = model.invoke.mock.calls[0][0] as { content: string }[];
    // The short chapter keeps all of its text; the long one gets the rest of the limit.
    expect(human.content).toContain(`${"short ".repeat(1_000)}\n</document>`);
    expect(human.content.length).toBeLessThan(MAX_DOCUMENT_CHARS + 100);
  });

  it("accepts a quiz 2 questions short, and fails a shorter one without using the quota", async () => {
    const courseId = await newCourse(USER);
    const chapterIds = [await addChapter(courseId, "cells.pdf", "Text.")];
    model.invoke.mockResolvedValueOnce(generated(8)).mockResolvedValueOnce(generated(7));

    expect((await generate(courseId, { chapterIds, questionCount: 10 })).status).toBe(201);
    const failed = await generate(courseId, { chapterIds, questionCount: 10 });

    expect(failed.status).toBe(502);
    expect(failed.body.error).toContain("only 7 of 10");
    expect((await getMonthlyUsage(USER)).used).toBe(1);
    const attempts = await db
      .select({ status: quizGenerations.status })
      .from(quizGenerations)
      .where(eq(quizGenerations.userId, USER));
    expect(attempts.map((attempt) => attempt.status).sort()).toEqual(["failed", "succeeded"]);
    expect(await db.select().from(quizzes).where(eq(quizzes.courseId, courseId))).toHaveLength(1);
  });

  it("keeps 20 and 25 questions for Pro", async () => {
    const courseId = await newCourse(USER);
    const chapterIds = [await addChapter(courseId, "cells.pdf", "Text.")];

    expect((await generate(courseId, { chapterIds, questionCount: 20 })).status).toBe(403);
    expect(model.invoke).not.toHaveBeenCalled();

    await db.update(users).set({ subscribed: true }).where(eq(users.id, USER));
    model.invoke.mockResolvedValue(generated(20));
    expect((await generate(courseId, { chapterIds, questionCount: 20 })).status).toBe(201);
  });

  it("refuses bad requests and other users' chapters before calling the AI", async () => {
    const courseId = await newCourse(USER);
    const chapterId = await addChapter(courseId, "cells.pdf", "Text.");
    const otherCourse = await newCourse(USER, "Chemistry");
    const otherUsersCourse = await newCourse(OTHER_USER);
    const otherUsersChapter = await addChapter(otherUsersCourse, "theirs.pdf", "Text.");

    const statuses = [
      await generate(courseId, { chapterIds: [], questionCount: 10 }),
      await generate(courseId, { chapterIds: [chapterId], questionCount: 7 }),
      await generate(courseId, "not json"),
      await generate(courseId, { chapterIds: [chapterId, otherUsersChapter], questionCount: 10 }),
      await generate(otherCourse, { chapterIds: [chapterId], questionCount: 10 }),
      await generate(otherUsersCourse, { chapterIds: [otherUsersChapter], questionCount: 10 }),
      await generate("abc", { chapterIds: [chapterId], questionCount: 10 }),
    ].map((response) => response.status);

    expect(statuses).toEqual([400, 400, 400, 404, 404, 404, 404]);
    session.signedIn = false;
    expect((await generate(courseId, { chapterIds: [chapterId], questionCount: 10 })).status).toBe(
      401,
    );
    expect(model.invoke).not.toHaveBeenCalled();
    expect(await db.select().from(quizzes).where(eq(quizzes.userId, USER))).toEqual([]);
  });
});
