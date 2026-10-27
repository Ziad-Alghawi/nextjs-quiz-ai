import { eq, like } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { db } from "@/db";
import {
  authAccounts,
  authSessions,
  authVerifications,
  courses,
  quizzes,
  rateLimits,
  users,
} from "@/db/schema";
import { getSignInMethods } from "@/server/services/account";
import { auth } from "./auth";

// Collects the emails instead of sending them, also when .env configures SMTP.
const sent = vi.hoisted(() => [] as { to: string; subject: string; text: string }[]);
vi.mock("@/server/services/mail", () => ({
  sendEmail: async (email: { to: string; subject: string; text: string }) => {
    sent.push(email);
  },
}));
// after() needs a Next.js request; the email promise has already started and simply runs.
vi.mock("next/server", () => ({ after: () => {} }));

const PREFIX = "auth-db-test-";
const email = (name: string) => `${PREFIX}${name}@example.com`;
const PASSWORD = "first password";

// The same HTTP endpoints the browser calls, so origin checks and plugins run as in production.
async function request(method: "GET" | "POST", path: string, body?: object, cookie?: string) {
  const baseURL = process.env.APP_URL!;
  const response = await auth.handler(
    new Request(`${baseURL}/api/auth${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        origin: baseURL,
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
  const sessionCookie = response.headers
    .getSetCookie()
    .map((header) => header.split(";")[0])
    .find((pair) => pair.startsWith("better-auth.session_token=") && !pair.endsWith("="));
  const isJson = response.headers.get("content-type")?.includes("application/json");
  return {
    status: response.status,
    body: isJson ? ((await response.json()) as Record<string, unknown> | null) : null,
    cookie: sessionCookie,
  };
}
const post = (path: string, body: object, cookie?: string) => request("POST", path, body, cookie);

const signUp = (address: string, name = "Tester", password = PASSWORD) =>
  post("/sign-up/email", { name, email: address, password });
const signIn = (address: string, password = PASSWORD) =>
  post("/sign-in/email", { email: address, password });
const lastCodeFor = (address: string) =>
  sent
    .filter((mail) => mail.to === address)
    .at(-1)
    ?.text.match(/Your code: (\d{6})/)?.[1];
const userByEmail = (address: string) =>
  db.query.users.findFirst({ where: eq(users.email, address) });
const sessionCount = async (userId: string) =>
  (await db.select().from(authSessions).where(eq(authSessions.userId, userId))).length;

const cleanUp = async () => {
  await db.delete(users).where(like(users.email, `${PREFIX}%`));
  // Rate-limit rows don't belong to a user row, so they outlive it.
  await db.delete(rateLimits).where(like(rateLimits.key, "existing-account-email:%"));
};

beforeEach(async () => {
  await cleanUp();
  sent.length = 0;
});

afterAll(cleanUp);

describe("sign-up and sign-in", () => {
  it("doesn't sign in after sign-up and answers a repeated sign-up the same way", async () => {
    const first = await signUp(email("dup"), "Original");
    expect(first.status).toBe(200);
    expect(first.cookie).toBeUndefined();

    const second = await signUp(email("dup"), "Someone else", "second password");
    expect(second.status).toBe(200);
    expect(Object.keys(second.body!)).toEqual(Object.keys(first.body!));

    const user = await userByEmail(email("dup"));
    expect(user?.name).toBe("Original");
    expect(await getSignInMethods(user!.id)).toEqual({ password: true, google: false });
    expect((await signIn(email("dup"), "second password")).status).toBe(401);
    expect((await signIn(email("dup"))).cookie).toBeDefined();
  });

  it("signs in after signing up with capital letters in the email", async () => {
    const address = email("Mixed-Case");

    expect((await signUp(address)).status).toBe(200);
    expect((await userByEmail(address.toLowerCase()))?.email).toBe(address.toLowerCase());
    expect((await signIn(address.toLowerCase())).cookie).toBeDefined();
    expect((await signIn(address)).cookie).toBeDefined();
  });

  // A Google-only account has no password: signing up with its email creates nothing and signing in
  // says "invalid", so without this email the owner wouldn't know how to get in.
  it("emails the owner of a Google-only account how to sign in when someone signs up with it", async () => {
    const address = email("google-only");
    const [owner] = await db
      .insert(users)
      .values({ id: `${PREFIX}google-only`, name: "Google user", email: address })
      .returning();
    await db.insert(authAccounts).values({
      id: `${PREFIX}google-account`,
      accountId: "google-sub-123",
      providerId: "google",
      userId: owner.id,
    });

    const response = await signUp(address.toUpperCase());
    const fresh = await signUp(email("someone-new"));
    // Same answer as for a new email, so the sign-up page still reveals nothing.
    expect(response.status).toBe(200);
    expect(Object.keys(response.body!)).toEqual(Object.keys(fresh.body!));
    expect(await getSignInMethods(owner.id)).toEqual({ password: false, google: true });
    expect((await signIn(address)).body).toMatchObject({ code: "INVALID_EMAIL_OR_PASSWORD" });

    await vi.waitFor(() => expect(sent.filter((mail) => mail.to === address)).toHaveLength(1));
    const [mail] = sent.filter((m) => m.to === address);
    expect(mail.subject).toBe("You already have a Quiz AI account");
    expect(mail.text).toContain("Continue with Google");
    expect(mail.text).toContain("/forgot-password");
    expect(sent.filter((m) => m.to === email("someone-new"))).toHaveLength(0);
  });

  it("sends that email at most once per 15 minutes, also for parallel sign-ups", async () => {
    await signUp(email("flooded"));
    const owner = await userByEmail(email("flooded"));

    await Promise.all(Array.from({ length: 5 }, () => signUp(email("flooded"))));
    await signUp(email("flooded"));
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    // Give any extra (wrongly allowed) background send time to arrive before counting.
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(sent).toHaveLength(1);

    await db
      .update(rateLimits)
      .set({ lastRequest: Date.now() - 16 * 60 * 1000 })
      .where(eq(rateLimits.key, `existing-account-email:${owner!.id}`));
    await signUp(email("flooded"));
    await vi.waitFor(() => expect(sent).toHaveLength(2));
  });

  it("emails the owner of a password account to sign in with the password", async () => {
    await signUp(email("has-password"));
    await signUp(email("has-password"), "Someone else", "second password");

    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].text).toContain("Sign in with your password");
    expect(sent[0].text).not.toContain("Continue with Google");
  });

  it("switches off the email OTP endpoints the app doesn't use", async () => {
    for (const path of ["/sign-in/email-otp", "/email-otp/send-verification-otp"]) {
      const response = await post(path, { email: email("x"), otp: "123456", type: "sign-in" });
      expect(response.status).toBe(404);
    }
  });
});

describe("password reset with an email code", () => {
  it("sends codes only to registered emails, stores them hashed and signs out everywhere", async () => {
    await signUp(email("reset"));
    await signIn(email("reset"));
    await signIn(email("reset"));
    const user = await userByEmail(email("reset"));
    expect(await sessionCount(user!.id)).toBe(2);

    const unknown = await post("/email-otp/request-password-reset", { email: email("nobody") });
    expect(unknown.status).toBe(200);
    expect(sent).toHaveLength(0);

    await post("/email-otp/request-password-reset", { email: email("reset") });
    const code = lastCodeFor(email("reset"));
    expect(code).toMatch(/^\d{6}$/);
    const [stored] = await db
      .select()
      .from(authVerifications)
      .where(like(authVerifications.identifier, `%${email("reset")}`));
    expect(stored.value).not.toContain(code);

    const reset = await post("/email-otp/reset-password", {
      email: email("reset"),
      otp: code,
      password: "second password",
    });
    expect(reset.status).toBe(200);
    expect(await sessionCount(user!.id)).toBe(0);
    expect((await signIn(email("reset"))).status).toBe(401);
    expect((await signIn(email("reset"), "second password")).status).toBe(200);
  });

  it("locks a code after 3 wrong attempts", async () => {
    await signUp(email("locked"));
    await post("/email-otp/request-password-reset", { email: email("locked") });
    const code = lastCodeFor(email("locked"))!;
    const wrong = code === "000000" ? "111111" : "000000";
    const attempt = (otp: string) =>
      post("/email-otp/reset-password", { email: email("locked"), otp, password: "new password" });

    for (let i = 0; i < 3; i++) expect((await attempt(wrong)).status).toBe(400);
    expect((await attempt(code)).status).toBe(403);
  });
});

describe("account settings", () => {
  it("changes the email only with the code sent to the new address", async () => {
    await signUp(email("taken"));
    await signUp(email("old"));
    const { cookie } = await signIn(email("old"));

    // An address that belongs to another account gets the same answer but no code.
    const taken = await post(
      "/email-otp/request-email-change",
      { newEmail: email("taken") },
      cookie,
    );
    expect(taken.status).toBe(200);
    expect(sent).toHaveLength(0);

    await post("/email-otp/request-email-change", { newEmail: email("new") }, cookie);
    const otp = lastCodeFor(email("new"));
    expect(otp).toBeDefined();

    const change = await post("/email-otp/change-email", { newEmail: email("new"), otp }, cookie);
    expect(change.status).toBe(200);
    expect(await userByEmail(email("old"))).toBeUndefined();
    expect((await signIn(email("new"))).status).toBe(200);
  });

  it("changes the password and signs out the other sessions", async () => {
    await signUp(email("change"));
    const here = await signIn(email("change"));
    const elsewhere = await signIn(email("change"));
    const change = (currentPassword: string) =>
      post(
        "/change-password",
        { currentPassword, newPassword: "second password", revokeOtherSessions: true },
        here.cookie,
      );

    expect((await change("wrong")).status).toBe(400);
    const changed = await change(PASSWORD);
    expect(changed.status).toBe(200);
    expect((await request("GET", "/get-session", undefined, elsewhere.cookie)).body).toBeNull();
    expect((await request("GET", "/get-session", undefined, changed.cookie)).body).not.toBeNull();
  });

  it("deletes the account with its courses and quizzes after checking the password", async () => {
    await signUp(email("delete"));
    const { cookie } = await signIn(email("delete"));
    const user = await userByEmail(email("delete"));
    const [course] = await db
      .insert(courses)
      .values({ name: "Doomed course", userId: user!.id })
      .returning({ id: courses.id });
    await db.insert(quizzes).values({ name: "Doomed quiz", userId: user!.id, courseId: course.id });

    expect((await post("/delete-user", { password: "wrong" }, cookie)).status).toBe(400);
    expect(await userByEmail(email("delete"))).toBeDefined();

    expect((await post("/delete-user", { password: PASSWORD }, cookie)).status).toBe(200);
    expect(await userByEmail(email("delete"))).toBeUndefined();
    expect(await db.select().from(quizzes).where(eq(quizzes.userId, user!.id))).toHaveLength(0);
    expect(await db.select().from(courses).where(eq(courses.userId, user!.id))).toHaveLength(0);
  });
});

describe("guests", () => {
  /** Signs in a new guest over HTTP, deleted again after the test. */
  async function signInAsGuest() {
    const guest = await post("/sign-in/anonymous", {});
    const id = (guest.body?.user as { id: string }).id;
    onTestFinished(async () => {
      await db.delete(users).where(eq(users.id, id));
    });
    return { ...guest, id };
  }

  it("signs in without an account as a guest", async () => {
    const { status, cookie, id } = await signInAsGuest();

    expect(status).toBe(200);
    const session = await request("GET", "/get-session", undefined, cookie);
    expect(session.body).toMatchObject({ user: { id, isAnonymous: true } });
    const [row] = await db.select().from(users).where(eq(users.id, id));
    expect(row.isAnonymous).toBe(true);
  });

  it("can't change the email, password or profile", async () => {
    const { cookie } = await signInAsGuest();

    for (const [path, body] of [
      ["/change-password", { currentPassword: PASSWORD, newPassword: "second password" }],
      ["/change-email", { newEmail: email("guest") }],
      ["/update-user", { name: "Guest" }],
      ["/email-otp/request-email-change", { newEmail: email("guest") }],
    ] as const) {
      const result = await post(path, body, cookie);
      expect(result.status, path).toBe(403);
      expect(result.body).toMatchObject({ message: "Create an account to change this." });
    }
    expect(await userByEmail(email("guest"))).toBeUndefined();
  });
});
