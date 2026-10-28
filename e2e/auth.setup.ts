import {
  E2E_USER,
  expect,
  GUEST_STORAGE_STATE,
  signIn,
  signUp,
  STORAGE_STATE,
  test,
} from "./fixtures";

test("signs in the shared account", async ({ page }) => {
  await signUp(page, E2E_USER);
  await signIn(page, E2E_USER);
  await expect(page).toHaveURL("/dashboard");
  await page.context().storageState({ path: STORAGE_STATE });
});

test("starts the guest trial from the trial page", async ({ page }) => {
  await page.goto("/try");
  await page.getByRole("button", { name: "Start trial" }).click();
  await expect(page.getByText("3 of 3 trial quizzes left.")).toBeVisible();
  await page.context().storageState({ path: GUEST_STORAGE_STATE });
});
