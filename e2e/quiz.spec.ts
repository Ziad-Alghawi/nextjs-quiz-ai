import type { Page } from "@playwright/test";
import { makePdf } from "@/test/make-pdf";
import { connect, insertQuiz } from "./db";
import { blockPaidRoutes, expect, newAccount, signIn, signUp, test } from "./fixtures";

// The tests build on each other in one signed-in page: sign-in allows 5 per 5 minutes per IP, and
// auth.spec.ts already uses 4 of them.
test.describe.configure({ mode: "serial" });

const sql = connect();
let page: Page;
let courseUrl: string;
let generated = 0;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext();
  await blockPaidRoutes(context);
  page = await context.newPage();
  const account = newAccount();
  await signUp(page, account);
  await signIn(page, account);
  await expect(page).toHaveURL("/dashboard");
});

test.afterAll(async () => {
  await page.context().close();
  await sql.end();
});

/** Generates a quiz of 5 questions; the request is answered with a seeded quiz instead of Gemini. */
async function generateQuiz() {
  const name = `Quiz ${++generated}`;
  await page.route(
    "**/api/courses/*/quizzes",
    async (route) => {
      const courseId = Number(new URL(route.request().url()).pathname.split("/")[3]);
      const quizId = await insertQuiz(sql, courseId, name, 5);
      await route.fulfill({ status: 201, json: { quizId, truncated: false } });
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Generate quiz" }).click();
  await expect(page).toHaveURL(/\/quizzes\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

/** Picks the given option of each question in turn and moves on, up to the results. */
async function answerQuiz(picks: string[]) {
  for (const [index, pick] of picks.entries()) {
    await page.getByRole("button", { name: pick, exact: true }).click();
    const isLast = index === picks.length - 1;
    await page.getByRole("button", { name: isLast ? "See results" : "Next question" }).click();
  }
}

test("creates a course and uploads a chapter", async () => {
  await page.getByRole("button", { name: "New course" }).first().click();
  await page.getByLabel("Course name").fill("Biology");
  await page.getByRole("button", { name: "Create course" }).click();
  await expect(page).toHaveURL(/\/courses\/\d+$/);
  courseUrl = page.url();

  const pdf = makePdf(["Mitochondria make energy.", "Ribosomes make proteins."]);
  await page.locator('input[type="file"]').setInputFiles({
    name: "cells.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await pdf.arrayBuffer()),
  });

  // The generator lists a chapter only once it is saved.
  await expect(page.getByRole("checkbox", { name: "cells.pdf" })).toBeChecked();
});

test("a failed generation shows an error and keeps the form", async () => {
  // Nothing answers the request here, so it fails as it would without a connection.
  await page.getByRole("button", { name: "Generate quiz" }).click();

  await expect(page.getByText(/Could not reach the server/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate quiz" })).toBeEnabled();
  await expect(page).toHaveURL(courseUrl);
});

test("takes a generated quiz, then practises the mistake without saving it", async () => {
  await generateQuiz();
  await expect(page.getByText("Question 1 of 5")).toBeVisible();

  await page.getByRole("button", { name: "Wrong answer 1", exact: true }).click();
  await expect(page.getByText("Not quite. The answer is A.")).toBeVisible();
  await expect(page.getByText("Explanation 1.")).toBeVisible();
  await page.getByRole("button", { name: "Next question" }).click();
  await answerQuiz(["Right answer 2", "Right answer 3", "Right answer 4", "Right answer 5"]);

  await expect(page.getByRole("heading", { level: 1, name: "4 of 5 correct" })).toBeVisible();
  await expect(page.getByText("80%")).toBeVisible();

  await page.getByRole("button", { name: "Practice mistakes (1)" }).click();
  await expect(page.getByText("Practice · not saved")).toBeVisible();
  await answerQuiz(["Right answer 1"]);
  await expect(page.getByRole("heading", { level: 1, name: "1 of 1 correct" })).toBeVisible();
  await expect(page.getByText("Practice round · not saved")).toBeVisible();

  // Only the first round was saved.
  await page.getByRole("link", { name: "Back to course" }).click();
  await expect(page).toHaveURL(courseUrl);
  await expect(page.getByText("1 attempt · Best 80%")).toBeVisible();
});

test("reviews the saved attempt", async () => {
  await page.getByText("1 attempt · Best 80%").click();
  await page.getByRole("link", { name: "View", exact: true }).click();

  await expect(page).toHaveURL(/\/attempts\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Quiz 1" })).toBeVisible();
  await expect(page.getByText("4 of 5 correct")).toBeVisible();
  await expect(page.getByText("Wrong answer 1", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Practice mistakes (1)" })).toBeVisible();
});

test("mixes two quizzes into a review quiz", async () => {
  await page.goto(courseUrl);
  await generateQuiz();
  await page.goto(courseUrl);

  const quizzes = page.getByRole("group", { name: "Quizzes to mix" });
  await quizzes.getByRole("checkbox", { name: /Quiz 1/ }).check();
  await quizzes.getByRole("checkbox", { name: /Quiz 2/ }).check();
  await page.getByRole("button", { name: "Create review quiz" }).click();

  await expect(page).toHaveURL(/\/quizzes\/\d+$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Review: Quiz 1, Quiz 2" }),
  ).toBeVisible();
  await expect(page.getByText("Question 1 of 10")).toBeVisible();
});

test("a course exam shows no feedback until it is finished", async () => {
  await page.goto(courseUrl);
  await page.getByRole("button", { name: "Start exam" }).click();

  await expect(page).toHaveURL(/\/quizzes\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: /^Exam: Biology/ })).toBeVisible();
  // The browser never gets the correct answers.
  expect(await page.content()).not.toContain("isCorrect");

  const answers = page.getByRole("group", { name: "Answers" });
  for (let n = 1; n <= 10; n++) {
    await expect(page.getByText(`Question ${n} of 10`)).toBeVisible();
    await answers
      .getByRole("button", { name: n === 1 ? /^Wrong answer/ : /^Right answer/ })
      .click();
    if (n < 10) await page.getByRole("button", { name: "Next question" }).click();
  }
  await expect(page.getByText("Correct!")).toHaveCount(0);
  await expect(page.getByText("10 of 10 answered")).toBeVisible();

  await page.getByRole("button", { name: "Finish exam" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Finish exam" }).click();

  await expect(page).toHaveURL(/\/attempts\/\d+$/);
  await expect(page.getByText("9 of 10 correct")).toBeVisible();
  await expect(page.getByRole("link", { name: "Retake exam" })).toBeVisible();
});
