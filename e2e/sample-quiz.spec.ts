import { expect, test } from "./fixtures";

test("a visitor plays the sample quiz with the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Try a sample quiz" }).first().click();
  await expect(page).toHaveURL("/quizzes/sample");
  await expect(page.getByText("Question 1 of 3")).toBeVisible();

  // 1-4 pick an option and Enter moves on, as the focus is on Next once answered.
  await page.keyboard.press("1");
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Question 2 of 3")).toBeVisible();
  await page.keyboard.press("3");
  await expect(page.getByText("Not quite. The answer is A.")).toBeVisible();
  await expect(page.getByText(/React keeps a copy of the page in memory/)).toBeVisible();
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "A syntax extension for JavaScript" }).click();
  await page.getByRole("button", { name: "See results" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "2 of 3 correct" })).toBeVisible();
  await expect(page.getByText("67%")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
});
