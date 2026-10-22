import { beforeEach, describe, expect, it, vi } from "vitest";
import { formData } from "@/test/form-data";
import { startCheckout } from "./billing";

const { createCheckoutSession, redirect } = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(),
  // The real redirect() throws to end the action; the test only records where it went.
  redirect: vi.fn(),
}));
vi.mock("@/server/session", () => ({
  requireUser: async () => ({ id: "user-1", name: "Test", email: "test@example.com", image: null }),
}));
vi.mock("@/server/services/billing", () => ({ createCheckoutSession }));
vi.mock("next/navigation", () => ({ redirect }));

beforeEach(() => vi.clearAllMocks());

describe("startCheckout", () => {
  it.each(["month", "year"])("sends the user on with the %sly price", async (interval) => {
    createCheckoutSession.mockResolvedValue({ url: `https://checkout.example/${interval}` });

    await startCheckout(formData({ interval }));

    expect(createCheckoutSession).toHaveBeenCalledWith("user-1", interval);
    expect(redirect).toHaveBeenCalledWith(`https://checkout.example/${interval}`);
  });

  it("rejects any other interval before Stripe is called", async () => {
    await expect(startCheckout(formData({ interval: "week" }))).rejects.toThrow();
    await expect(startCheckout(formData({}))).rejects.toThrow();

    expect(createCheckoutSession).not.toHaveBeenCalled();
  });
});
