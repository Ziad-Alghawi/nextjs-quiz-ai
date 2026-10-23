import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  cancelSubscriptions,
  createBillingPortalSession,
  getSubscriptionSummary,
  getUpgradeUrl,
} from "./billing";

const stripeMock = vi.hoisted(() => ({
  list: vi.fn(),
  cancel: vi.fn(),
  createCustomer: vi.fn(),
  createPortalSession: vi.fn(),
  createCheckoutSession: vi.fn(),
}));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: { list: stripeMock.list, cancel: stripeMock.cancel },
    customers: { create: stripeMock.createCustomer },
    billingPortal: { sessions: { create: stripeMock.createPortalSession } },
    checkout: { sessions: { create: stripeMock.createCheckoutSession } },
  }),
}));

const USER = "billing-db-test-user";

// Stripe's list() returns an auto-paginating async iterable.
const listOf = (...statuses: Stripe.Subscription.Status[]) =>
  (async function* () {
    for (const [i, status] of statuses.entries()) yield { id: `sub_${i}`, status };
  })();
const failingList = (error: Error) =>
  (async function* () {
    yield* [];
    throw error;
  })();

const addUser = (stripeCustomerId: string | null) =>
  db.insert(users).values({
    id: USER,
    name: "Billing test",
    email: `${USER}@example.com`,
    stripeCustomerId,
  });

beforeEach(async () => {
  await db.delete(users).where(eq(users.id, USER));
  vi.clearAllMocks();
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, USER));
});

describe("Stripe customer", () => {
  it("is created once with an idempotency key, then reused", async () => {
    await addUser(null);
    stripeMock.createCustomer.mockResolvedValue({ id: "cus_new" });
    stripeMock.createPortalSession.mockResolvedValue({ url: "https://billing.example" });

    await createBillingPortalSession(USER);
    await createBillingPortalSession(USER);

    // The key makes a parallel second request (double click) get the same customer from Stripe.
    expect(stripeMock.createCustomer.mock.calls).toEqual([
      [{ metadata: { dbId: USER } }, { idempotencyKey: `customer-${USER}` }],
    ]);
    expect(stripeMock.createPortalSession).toHaveBeenLastCalledWith(
      expect.objectContaining({ customer: "cus_new" }),
    );
  });
});

describe("getUpgradeUrl", () => {
  beforeEach(async () => {
    await addUser("cus_test");
    stripeMock.createCheckoutSession.mockResolvedValue({ url: "https://checkout.example" });
    stripeMock.createPortalSession.mockResolvedValue({ url: "https://billing.example" });
  });

  // The test env sets STRIPE_PRICE_ID=price_123 and STRIPE_YEARLY_PRICE_ID=price_456.
  it.each([
    ["month", "price_123"],
    ["year", "price_456"],
  ] as const)("opens checkout with the %sly price", async (interval, price) => {
    stripeMock.list.mockReturnValue(listOf());

    await expect(getUpgradeUrl(USER, interval)).resolves.toBe("https://checkout.example");
    expect(stripeMock.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_test",
        line_items: [{ price, quantity: 1 }],
      }),
    );
  });

  it("opens checkout when the earlier subscriptions have ended", async () => {
    stripeMock.list.mockReturnValue(listOf("canceled", "incomplete_expired"));

    await expect(getUpgradeUrl(USER, "month")).resolves.toBe("https://checkout.example");
  });

  // A late webhook leaves the user on Free for a moment; another Upgrade must not pay twice.
  it.each(["active", "trialing", "past_due"] as const)(
    "opens the billing portal instead while a subscription is %s",
    async (status) => {
      stripeMock.list.mockReturnValue(listOf("canceled", status));

      await expect(getUpgradeUrl(USER, "year")).resolves.toBe("https://billing.example");
      expect(stripeMock.createCheckoutSession).not.toHaveBeenCalled();
      expect(stripeMock.createPortalSession).toHaveBeenCalledWith(
        expect.objectContaining({ customer: "cus_test" }),
      );
    },
  );

  it("throws when Stripe returns no checkout URL", async () => {
    stripeMock.list.mockReturnValue(listOf());
    stripeMock.createCheckoutSession.mockResolvedValue({ url: null });

    await expect(getUpgradeUrl(USER, "month")).rejects.toThrow("did not return a checkout URL");
  });
});

describe("getSubscriptionSummary", () => {
  const PERIOD_END = 1_793_000_000;
  const subscription = (
    interval: "month" | "year",
    cancelAtPeriodEnd: boolean,
    cancelAt: number | null = null,
  ) => ({
    cancel_at: cancelAt,
    cancel_at_period_end: cancelAtPeriodEnd,
    items: { data: [{ current_period_end: PERIOD_END, price: { recurring: { interval } } }] },
  });

  it.each([
    ["year", false],
    ["month", true],
  ] as const)("reads a %sly subscription (cancels: %s)", async (interval, cancels) => {
    await addUser("cus_test");
    stripeMock.list.mockResolvedValue({ data: [subscription(interval, cancels)] });

    await expect(getSubscriptionSummary(USER)).resolves.toEqual({
      interval,
      periodEnd: new Date(PERIOD_END * 1000),
      cancels,
    });
    expect(stripeMock.list).toHaveBeenCalledWith({
      customer: "cus_test",
      status: "active",
      limit: 1,
    });
  });

  it("reads a cancellation the billing portal scheduled with cancel_at", async () => {
    const cancelAt = PERIOD_END - 3600;
    await addUser("cus_test");
    stripeMock.list.mockResolvedValue({ data: [subscription("month", false, cancelAt)] });

    await expect(getSubscriptionSummary(USER)).resolves.toEqual({
      interval: "month",
      periodEnd: new Date(cancelAt * 1000),
      cancels: true,
    });
  });

  it("is null without an active subscription or a Stripe customer", async () => {
    await addUser("cus_test");
    stripeMock.list.mockResolvedValue({ data: [] });
    await expect(getSubscriptionSummary(USER)).resolves.toBeNull();

    await db.update(users).set({ stripeCustomerId: null }).where(eq(users.id, USER));
    stripeMock.list.mockClear();
    await expect(getSubscriptionSummary(USER)).resolves.toBeNull();
    expect(stripeMock.list).not.toHaveBeenCalled();
  });
});

describe("cancelSubscriptions", () => {
  it("does nothing for users who never opened checkout", async () => {
    await addUser(null);
    await cancelSubscriptions(USER);
    expect(stripeMock.list).not.toHaveBeenCalled();
  });

  it("cancels every subscription that can still bill", async () => {
    await addUser("cus_test");
    stripeMock.list.mockReturnValue(listOf("active", "canceled", "past_due", "incomplete_expired"));

    await cancelSubscriptions(USER);

    expect(stripeMock.list).toHaveBeenCalledWith({ customer: "cus_test", status: "all" });
    expect(stripeMock.cancel.mock.calls).toEqual([["sub_0"], ["sub_2"]]);
  });

  it("treats a customer deleted in Stripe as nothing to cancel", async () => {
    await addUser("cus_deleted");
    stripeMock.list.mockReturnValue(
      failingList(
        new Stripe.errors.StripeInvalidRequestError({
          type: "invalid_request_error",
          code: "resource_missing",
          message: "No such customer",
        }),
      ),
    );

    await expect(cancelSubscriptions(USER)).resolves.toBeUndefined();
  });

  it("throws when Stripe fails, so the account isn't deleted", async () => {
    await addUser("cus_test");
    stripeMock.list.mockReturnValue(
      failingList(
        new Stripe.errors.StripeAPIError({ type: "api_error", message: "Stripe is down" }),
      ),
    );

    await expect(cancelSubscriptions(USER)).rejects.toThrow("Stripe is down");
  });
});
