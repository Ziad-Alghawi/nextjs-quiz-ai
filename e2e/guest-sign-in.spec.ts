import { GUEST_TRIAL } from "@/lib/plans";
import { expect, test } from "./fixtures";

// Uses every guest sign-in this IP gets per hour (the database is new for each run). Specs that
// need a guest later must reuse a saved guest session.
test("allows 3 guest sign-ins per hour from one IP address", async ({ playwright, baseURL }) => {
  // A new context each time, like a new visitor: a guest's own cookie would make it a second
  // sign-in of the same guest, which Better Auth refuses.
  async function signInAsGuest() {
    const visitor = await playwright.request.newContext({ baseURL });
    // Better Auth checks the origin of POST requests, as a browser sends it.
    const response = await visitor.post("/api/auth/sign-in/anonymous", {
      data: {},
      headers: { origin: baseURL! },
    });
    const result = { status: response.status(), body: await response.json() };
    await visitor.dispose();
    return result;
  }

  for (let i = 0; i < GUEST_TRIAL.signInsPerHour; i++) {
    expect(await signInAsGuest()).toMatchObject({
      status: 200,
      body: { user: { isAnonymous: true } },
    });
  }
  expect((await signInAsGuest()).status).toBe(429);
});
