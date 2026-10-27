import { beforeEach, describe, expect, it, vi } from "vitest";
import { pingDatabase } from "@/db/health";
import { auth } from "@/lib/auth";
import { getCurrentUser, requireAccount } from "./session";

const requestHeaders = vi.hoisted(() => ({ value: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => requestHeaders.value }));
vi.mock("@/db/health", () => ({ pingDatabase: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
// The real redirect() throws to end the request; so does this one, with the target.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));

const withSessionCookie = () =>
  (requestHeaders.value = new Headers({ cookie: "better-auth.session_token=abc.def" }));

/** A session for Ann; `isAnonymous` makes her a guest. */
const signInAs = (isAnonymous: boolean) => {
  withSessionCookie();
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "u1", name: "Ann", email: "ann@example.com", image: null, isAnonymous },
    session: { expiresAt: new Date() },
  } as Awaited<ReturnType<typeof auth.api.getSession>>);
};

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requestHeaders.value = new Headers();
  });

  it("returns the signed-in user", async () => {
    signInAs(false);

    expect(await getCurrentUser()).toEqual({
      id: "u1",
      name: "Ann",
      email: "ann@example.com",
      image: null,
      isGuest: false,
    });
    expect(pingDatabase).not.toHaveBeenCalled();
  });

  it("marks a guest", async () => {
    signInAs(true);

    expect(await getCurrentUser()).toMatchObject({ id: "u1", isGuest: true });
  });

  it("returns null without a session cookie, without touching the database", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    expect(await getCurrentUser()).toBeNull();
    expect(pingDatabase).not.toHaveBeenCalled();
  });

  it("returns null for an invalid or expired session while the database is up", async () => {
    withSessionCookie();
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    vi.mocked(pingDatabase).mockResolvedValue(true);

    expect(await getCurrentUser()).toBeNull();
  });

  it("throws instead of signing the user out while the database is down", async () => {
    withSessionCookie();
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    vi.mocked(pingDatabase).mockResolvedValue(false);

    await expect(getCurrentUser()).rejects.toThrow("Service temporarily unavailable");
  });
});

describe("requireAccount", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requestHeaders.value = new Headers();
  });

  it("returns a user with an account", async () => {
    signInAs(false);

    expect(await requireAccount("/billing")).toMatchObject({ id: "u1", isGuest: false });
  });

  it("sends a guest to sign-up and back", async () => {
    signInAs(true);

    await expect(requireAccount("/billing")).rejects.toThrow(
      "redirect /sign-up?callbackUrl=%2Fbilling",
    );
  });

  it("sends a visitor without a session to sign-in and back", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    await expect(requireAccount("/billing")).rejects.toThrow(
      "redirect /sign-in?callbackUrl=%2Fbilling",
    );
  });
});
