import { expect, newAccount, signIn, signUp, test } from "./fixtures";

// One account for the whole file: all tests come from one IP, and sign-up allows 5 per hour and
// sign-in 5 per 5 minutes per IP.
test.describe.configure({ mode: "serial" });

const account = newAccount();

test("signs up, signs in and lands on the overview", async ({ page }) => {
  await signUp(page, account);
  await signIn(page, account);

  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
});

test("a wrong password gets the generic error", async ({ page }) => {
  await page.goto("/sign-in");
  await signIn(page, { email: account.email, password: "wrong-password-123" });

  await expect(page.getByText(/Invalid email or password/)).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});

test("a protected page sends a visitor to sign-in and back", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL("/sign-in?callbackUrl=%2Fsettings");

  await signIn(page, account);
  await expect(page).toHaveURL("/settings");
});

test("signing out ends the session", async ({ page }) => {
  await page.goto("/sign-in");
  await signIn(page, account);
  await expect(page).toHaveURL("/dashboard");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);
});
