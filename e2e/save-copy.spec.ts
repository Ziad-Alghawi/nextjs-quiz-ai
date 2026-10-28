import { connect, insertCourse, insertQuiz } from "./db";
import { blockPaidRoutes, E2E_USER, expect, STORAGE_STATE, test } from "./fixtures";

// Signed in with the shared account; the other quiz owner is only a database row, so no sign-in is
// spent on it.
// Serial, so the data below is seeded once and not by every worker.
test.describe.configure({ mode: "serial" });
test.use({ storageState: STORAGE_STATE });

const sql = connect();
const OWNER_EMAIL = "e2e-quiz-owner@example.com";
let othersLink: string;
let ownLink: string;

/** Shares the quiz straight in the database and returns its link. */
async function share(quizId: number, letter: string) {
  const token = letter.repeat(32);
  await sql`update quizzes set share_token = ${token} where id = ${quizId}`;
  return `/shared/${token}`;
}

test.beforeAll(async () => {
  await sql`insert into "user" (id, name, email) values ('e2e-quiz-owner', 'Quiz Owner', ${OWNER_EMAIL})`;
  const othersCourse = await insertCourse(sql, OWNER_EMAIL, "Chemistry");
  othersLink = await share(await insertQuiz(sql, othersCourse, "Atoms", 3), "A");
  const ownCourse = await insertCourse(sql, E2E_USER.email, "Biology basics");
  ownLink = await share(await insertQuiz(sql, ownCourse, "Cells", 3), "B");
});

test.afterAll(() => sql.end());

test("a visitor is asked to sign in to save a copy", async ({ browser }) => {
  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  await blockPaidRoutes(visitor);
  const page = await visitor.newPage();
  await page.goto(othersLink);

  await expect(page.getByText("Shared quiz. Your results aren't saved.")).toBeVisible();
  await page.getByRole("link", { name: "Sign in to save a copy" }).click();
  await expect(page).toHaveURL(`/sign-in?callbackUrl=${encodeURIComponent(othersLink)}`);
  await visitor.close();
});

test("a signed-in user saves a copy into My quizzes and plays it with saved results", async ({
  page,
}) => {
  await page.goto(othersLink);
  await page.getByRole("button", { name: "Save a copy" }).click();

  await expect(page).toHaveURL(/\/quizzes\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Atoms" })).toBeVisible();
  for (let n = 1; n <= 3; n++) {
    await page.getByRole("button", { name: `Right answer ${n}`, exact: true }).click();
    await page.getByRole("button", { name: n < 3 ? "Next question" : "See results" }).click();
  }
  await expect(page.getByRole("heading", { level: 1, name: "3 of 3 correct" })).toBeVisible();

  await page.getByRole("link", { name: "Back to course" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My quizzes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Atoms", exact: true })).toBeVisible();
  await expect(page.getByText("1 attempt · Best 100%")).toBeVisible();
});

test("the owner gets a link to their own quiz instead of a copy", async ({ page }) => {
  await page.goto(ownLink);

  await expect(page.getByText("You shared this quiz.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save a copy" })).toHaveCount(0);
  await page.getByRole("link", { name: "Open your quiz" }).click();
  await expect(page).toHaveURL(/\/quizzes\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Cells" })).toBeVisible();
});
