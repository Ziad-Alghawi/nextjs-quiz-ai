import { beforeEach, describe, expect, it, vi } from "vitest";
import { pingDatabase } from "@/db/health";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "./session";

const requestHeaders = vi.hoisted(() => ({ value: new Headers() }));

vi.mock("next/headers", () => ({ headers: async () => requestHeaders.value }));
vi.mock("@/db/health", () => ({ pingDatabase: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

const withSessionCookie = () =>
  (requestHeaders.value = new Headers({ cookie: "better-auth.session_token=abc.def" }));

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requestHeaders.value = new Headers();
  });

  it("returns the signed-in user", async () => {
    withSessionCookie();
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "u1", name: "Ann", email: "ann@example.com", image: null },
      session: { expiresAt: new Date() },
    } as Awaited<ReturnType<typeof auth.api.getSession>>);

    expect(await getCurrentUser()).toEqual({
      id: "u1",
      name: "Ann",
      email: "ann@example.com",
      image: null,
    });
    expect(pingDatabase).not.toHaveBeenCalled();
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
