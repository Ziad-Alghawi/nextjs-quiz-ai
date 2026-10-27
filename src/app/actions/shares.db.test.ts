import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { createQuiz, getQuizWithQuestions } from "@/server/services/quizzes";
import * as shares from "@/server/services/shares";
import { createUsers, deleteUsers } from "@/test/db-fixtures";
import { formData, IDLE } from "@/test/form-data";
import { generatedQuiz } from "@/test/generated-quiz";
import { saveSharedQuiz, shareQuiz, stopSharingQuiz } from "./shares";

const USER = "share-actions-db-test-user";
const OTHER_USER = "share-actions-db-test-other";

vi.mock("@/server/session", () => ({
  requireAccount: async () => ({
    id: USER,
    name: "Test",
    email: "test@example.com",
    image: null,
    isGuest: false,
  }),
}));
const { revalidatePath, redirect } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  // The real redirect() throws to end the action; the test only records where it went.
  redirect: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

const NOT_SHAREABLE = {
  status: "error",
  error: "This quiz doesn't exist anymore or can't be shared. Reload the page.",
};
const NOT_FOUND = { status: "error", error: "This quiz doesn't exist anymore. Reload the page." };

const resetCopyLimit = () => db.delete(rateLimits).where(eq(rateLimits.key, `shared-copy:${USER}`));

beforeEach(async () => {
  await createUsers(USER, OTHER_USER);
  await resetCopyLimit();
  vi.clearAllMocks();
});
afterAll(async () => {
  await deleteUsers(USER, OTHER_USER);
  await resetCopyLimit();
});

describe("shareQuiz", () => {
  it("returns the token of the user's quiz", async () => {
    const quizId = await createQuiz(USER, generatedQuiz(2));

    const result = await shareQuiz(quizId);
    expect(result).toEqual({ status: "shared", token: expect.any(String) });
    const token = result.status === "shared" ? result.token : "";
    expect(await shares.getSharedQuiz(token)).toMatchObject({ id: quizId });
  });

  it("refuses another user's quiz and invalid ids", async () => {
    const othersQuiz = await createQuiz(OTHER_USER, generatedQuiz(2));

    for (const quizId of [othersQuiz, -1, 1.5]) {
      expect(await shareQuiz(quizId)).toEqual(NOT_SHAREABLE);
    }
  });
});

describe("stopSharingQuiz", () => {
  it("turns the link off", async () => {
    const quizId = await createQuiz(USER, generatedQuiz(2));
    const shared = await shareQuiz(quizId);
    expect(shared.status).toBe("shared");

    expect(await stopSharingQuiz(quizId)).toEqual({ status: "saved" });
    const token = shared.status === "shared" ? shared.token : "";
    expect(await shares.getSharedQuiz(token)).toBeUndefined();
  });

  it("refuses another user's quiz and invalid ids", async () => {
    const othersQuiz = await createQuiz(OTHER_USER, generatedQuiz(2));

    for (const quizId of [othersQuiz, -1, 1.5]) {
      expect(await stopSharingQuiz(quizId)).toEqual(NOT_FOUND);
    }
  });
});

describe("saveSharedQuiz", () => {
  const LINK_OFF = {
    status: "error",
    error: "This link was turned off, so the quiz can't be saved anymore.",
  };

  it("copies the shared quiz and opens the copy", async () => {
    const token = await shares.shareQuiz(
      OTHER_USER,
      await createQuiz(OTHER_USER, generatedQuiz(2)),
    );

    await saveSharedQuiz(IDLE, formData({ token: token! }));

    const quizId = Number(String(redirect.mock.lastCall?.[0]).split("/").pop());
    expect(redirect).toHaveBeenCalledWith(`/quizzes/${quizId}`);
    expect(await getQuizWithQuestions(USER, quizId)).toMatchObject({ name: "Cells" });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("explains why a copy can't be saved", async () => {
    const token = await shares.shareQuiz(USER, await createQuiz(USER, generatedQuiz(2)));

    expect(await saveSharedQuiz(IDLE, formData({ token: token! }))).toEqual({
      status: "error",
      error: "This is your own quiz, so there is nothing to save.",
    });
    expect(await saveSharedQuiz(IDLE, formData({ token: "x".repeat(32) }))).toEqual(LINK_OFF);
    expect(await saveSharedQuiz(IDLE, formData({ token: "not-a-token" }))).toEqual(LINK_OFF);
    expect(redirect).not.toHaveBeenCalled();
  });
});
