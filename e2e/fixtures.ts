import { randomUUID } from "node:crypto";
import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";

export { expect };

/**
 * Generation calls Gemini, which costs money, so it is blocked in every context. A test that needs a
 * generated quiz answers the request itself with page.route, which takes precedence over these.
 */
export async function blockPaidRoutes(context: BrowserContext) {
  await context.route("**/api/quizzes/generate", (route) => route.abort());
  await context.route("**/api/courses/*/quizzes", (route) => route.abort());
}

export const test = base.extend<{ blockPaidCalls: void }>({
  blockPaidCalls: [
    async ({ context }, use) => {
      await blockPaidRoutes(context);
      await use();
    },
    { auto: true },
  ],
});

export type Account = { name: string; email: string; password: string };

export const newAccount = (): Account => ({
  name: "E2E Tester",
  email: `e2e-${randomUUID()}@example.com`,
  password: "correct-horse-battery",
});

export async function signUp(page: Page, account: Account) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(account.name);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/sign-in\?notice=registered/);
}

/** Fills the sign-in form on the current page; the caller checks where it leads. */
export async function signIn(page: Page, { email, password }: Pick<Account, "email" | "password">) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
