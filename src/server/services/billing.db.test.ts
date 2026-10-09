import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import { cancelSubscriptions, createBillingPortalSession } from "./billing";

const stripeMock = vi.hoisted(() => ({
  list: vi.fn(),
  cancel: vi.fn(),
  createCustomer: vi.fn(),
  createPortalSession: vi.fn(),
}));
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: { list: stripeMock.list, cancel: stripeMock.cancel },
    customers: { create: stripeMock.createCustomer },
    billingPortal: { sessions: { create: stripeMock.createPortalSession } },
  },
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
