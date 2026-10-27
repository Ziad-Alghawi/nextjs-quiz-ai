import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createQuiz } from "@/server/services/quizzes";
import { getSharedQuiz } from "@/server/services/shares";
import { createUsers, deleteUsers } from "@/test/db-fixtures";
import { generatedQuiz } from "@/test/generated-quiz";
import { shareQuiz, stopSharingQuiz } from "./shares";

const USER = "share-actions-db-test-user";
const OTHER_USER = "share-actions-db-test-other";

vi.mock("@/server/session", () => ({
  requireUser: async () => ({ id: USER, name: "Test", email: "test@example.com", image: null }),
}));

const NOT_SHAREABLE = {
  status: "error",
  error: "This quiz doesn't exist anymore or can't be shared. Reload the page.",
};
const NOT_FOUND = { status: "error", error: "This quiz doesn't exist anymore. Reload the page." };

beforeEach(() => createUsers(USER, OTHER_USER));
afterAll(() => deleteUsers(USER, OTHER_USER));

describe("shareQuiz", () => {
  it("returns the token of the user's quiz", async () => {
    const quizId = await createQuiz(USER, generatedQuiz(2));

    const result = await shareQuiz(quizId);
    expect(result).toEqual({ status: "shared", token: expect.any(String) });
    const token = result.status === "shared" ? result.token : "";
    expect(await getSharedQuiz(token)).toMatchObject({ id: quizId });
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
    expect(await getSharedQuiz(token)).toBeUndefined();
  });

  it("refuses another user's quiz and invalid ids", async () => {
    const othersQuiz = await createQuiz(OTHER_USER, generatedQuiz(2));

    for (const quizId of [othersQuiz, -1, 1.5]) {
      expect(await stopSharingQuiz(quizId)).toEqual(NOT_FOUND);
    }
  });
});
