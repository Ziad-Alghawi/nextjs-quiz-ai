import { eq, like } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// CI runs these tests with only DATABASE_URL set (SKIP_ENV_VALIDATION); Better Auth needs these.
vi.hoisted(() => {
  process.env.AUTH_SECRET ??= "auth-db-test-secret-with-enough-length";
  process.env.APP_URL ??= "http://localhost:3000";
  process.env.GOOGLE_CLIENT_ID ??= "test-client-id";
  process.env.GOOGLE_CLIENT_SECRET ??= "test-client-secret";
});

// Collects the emails instead of sending them, also when .env configures SMTP.
const sent = vi.hoisted(() => [] as { to: string; subject: string; text: string }[]);
vi.mock("@/server/services/mail", () => ({
  sendEmail: async (email: { to: string; subject: string; text: string }) => {
    sent.push(email);
  },
}));
// after() needs a Next.js request; the email promise has already started and simply runs.
vi.mock("next/server", () => ({ after: () => {} }));

const { db } = await import("@/db");
const { authSessions, authVerifications, quizzes, users } = await import("@/db/schema");
const { auth } = await import("./auth");
const { getSignInMethods } = await import("@/server/services/account");

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

const cleanUp = () => db.delete(users).where(like(users.email, `${PREFIX}%`));

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

  it("deletes the account with its quizzes after checking the password", async () => {
    await signUp(email("delete"));
    const { cookie } = await signIn(email("delete"));
    const user = await userByEmail(email("delete"));
    await db.insert(quizzes).values({ name: "Doomed quiz", userId: user!.id });

    expect((await post("/delete-user", { password: "wrong" }, cookie)).status).toBe(400);
    expect(await userByEmail(email("delete"))).toBeDefined();

    expect((await post("/delete-user", { password: PASSWORD }, cookie)).status).toBe(200);
    expect(await userByEmail(email("delete"))).toBeUndefined();
    expect(await db.select().from(quizzes).where(eq(quizzes.userId, user!.id))).toHaveLength(0);
  });
});
