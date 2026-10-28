import { makePdf } from "@/test/make-pdf";
import { connect, insertQuiz, userIdOfSession } from "./db";
import { expect, GUEST_STORAGE_STATE, test } from "./fixtures";

// The guest saved by auth.setup.ts; the tests build on each other.
test.describe.configure({ mode: "serial" });
test.use({ storageState: GUEST_STORAGE_STATE });

const sql = connect();
test.afterAll(() => sql.end());

test("a guest makes a trial quiz, plays it and finds it on the trial page", async ({ page }) => {
  const guestId = await userIdOfSession(sql, GUEST_STORAGE_STATE);
  // Answers the generation with a seeded quiz instead of Gemini, as the real route would save it.
  await page.route("**/api/quizzes/generate", async (route) => {
    const [folder] = await sql<{ id: number }[]>`
      insert into courses (user_id, name, is_default) values (${guestId}, 'My quizzes', true)
      returning id`;
    const quizId = await insertQuiz(sql, folder.id, "Trial quiz", 5);
    await sql`insert into quiz_generations (user_id, plan, status) values (${guestId}, 'free', 'succeeded')`;
    await route.fulfill({ status: 201, json: { quizId, truncated: false } });
  });

  await page.goto("/try");
  await expect(page.getByText("3 of 3 trial quizzes left.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up", exact: true })).toBeVisible();
  const pdf = makePdf(["Mitochondria make energy."]);
  await page.locator('input[type="file"]').setInputFiles({
    name: "cells.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.arrayBuffer()),
  });
  // The trial offers only its question counts.
  await expect(page.getByRole("radio")).toHaveCount(2);
  await page.getByRole("button", { name: "Generate quiz" }).click();

  await expect(page).toHaveURL(/\/quizzes\/\d+$/);
  for (let n = 1; n <= 5; n++) {
    await page.getByRole("button", { name: `Right answer ${n}`, exact: true }).click();
    await page.getByRole("button", { name: n < 5 ? "Next question" : "See results" }).click();
  }
  await expect(page.getByRole("heading", { level: 1, name: "5 of 5 correct" })).toBeVisible();
  await page.getByRole("link", { name: "Back to trial" }).click();

  await expect(page).toHaveURL("/try");
  await expect(page.getByText("2 of 3 trial quizzes left.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Trial quiz" })).toBeVisible();
});

test("account pages send a guest to sign-up, which says how to keep the trial", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL("/sign-up?callbackUrl=%2Fdashboard");
  await expect(page.getByText(/sign in on this device/)).toBeVisible();
  await page.goto("/sign-in");
  await expect(
    page.getByText("Signing in moves your trial quizzes to your account."),
  ).toBeVisible();
});
