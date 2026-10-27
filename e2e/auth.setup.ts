import { E2E_USER, expect, signIn, signUp, STORAGE_STATE, test } from "./fixtures";

test("signs in the shared account", async ({ page }) => {
  await signUp(page, E2E_USER);
  await signIn(page, E2E_USER);
  await expect(page).toHaveURL("/dashboard");
  await page.context().storageState({ path: STORAGE_STATE });
});
