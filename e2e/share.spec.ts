import { connect, insertCourse, insertQuiz } from "./db";
import { blockPaidRoutes, E2E_USER, expect, STORAGE_STATE, test } from "./fixtures";

// The owner shares, a visitor plays, the owner turns the link off: each test needs the one before.
test.describe.configure({ mode: "serial" });
test.use({ storageState: STORAGE_STATE, permissions: ["clipboard-read", "clipboard-write"] });

const sql = connect();
let courseUrl: string;
let quizId: number;
let link: string;

test.beforeAll(async () => {
  const courseId = await insertCourse(sql, E2E_USER.email, "Physics");
  quizId = await insertQuiz(sql, courseId, "Forces", 3);
  courseUrl = `/courses/${courseId}`;
});

test.afterAll(() => sql.end());

test("the owner creates a link and copies it", async ({ page }) => {
  await page.goto(courseUrl);
  await page.getByRole("button", { name: "Share Forces" }).click();
  const dialog = page.getByRole("dialog", { name: "Share quiz" });
  await dialog.getByRole("button", { name: "Create link" }).click();

  const field = dialog.getByLabel("Link");
  await expect(field).toHaveValue(/\/shared\/[\w-]{32}$/);
  link = await field.inputValue();
  await dialog.getByRole("button", { name: "Copy link" }).click();
  await expect(dialog.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Share Forces" })).toHaveText("Shared");
});

test("a visitor plays the shared quiz without an account and nothing is saved", async ({
  browser,
}) => {
  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  await blockPaidRoutes(visitor);
  const page = await visitor.newPage();
  await page.goto(link);

  await expect(page.getByRole("heading", { level: 1, name: "Forces" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  for (let n = 1; n <= 3; n++) {
    await page.getByRole("button", { name: `Right answer ${n}`, exact: true }).click();
    await page.getByRole("button", { name: n < 3 ? "Next question" : "See results" }).click();
  }
  await expect(page.getByRole("heading", { level: 1, name: "3 of 3 correct" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");

  const [{ attempts }] = await sql<{ attempts: number }[]>`
    select count(*)::int as attempts from quiz_attempts where quiz_id = ${quizId}`;
  expect(attempts).toBe(0);
  await visitor.close();
});

test("turning the link off makes it a 404", async ({ page }) => {
  await page.goto(courseUrl);
  await page.getByRole("button", { name: "Share Forces" }).click();
  const dialog = page.getByRole("dialog", { name: "Share quiz" });
  await dialog.getByRole("button", { name: "Stop sharing" }).click();
  await expect(dialog.getByRole("button", { name: "Create link" })).toBeVisible();

  expect((await page.request.get(link)).status()).toBe(404);
});
