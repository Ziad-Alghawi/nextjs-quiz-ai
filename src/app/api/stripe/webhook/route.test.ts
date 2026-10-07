import Stripe from "stripe";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const setSubscribed = vi.fn();
vi.mock("@/server/services/billing", () => ({ setSubscribed }));

const WEBHOOK_SECRET = "whsec_test_secret";
let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const env = {
    DATABASE_URL: "postgres://u:p@localhost:5432/db",
    AUTH_SECRET: "secret",
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    GEMINI_API_KEY: "key",
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STRIPE_PRICE_ID: "price_123",
    APP_URL: "http://localhost:3000",
  };
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  ({ POST } = await import("./route"));
});

beforeEach(() => setSubscribed.mockReset());

const signedRequest = (type: string, subscription: object, secret = WEBHOOK_SECRET) => {
  const payload = JSON.stringify({
    id: "evt_1",
    object: "event",
    type,
    data: { object: subscription },
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": signature },
  });
};

const subscription = (status: string) => ({
  id: "sub_1",
  object: "subscription",
  customer: "cus_1",
  status,
});

describe("POST /api/stripe/webhook", () => {
  it.each([
    ["customer.subscription.created", "active", true],
    ["customer.subscription.updated", "trialing", true],
    ["customer.subscription.updated", "past_due", false],
    ["customer.subscription.updated", "incomplete", false],
    ["customer.subscription.deleted", "canceled", false],
  ])("%s with status %s sets subscribed to %s", async (type, status, expected) => {
    const response = await POST(signedRequest(type, subscription(status)));

    expect(response.status).toBe(200);
    expect(setSubscribed).toHaveBeenCalledWith("cus_1", expected);
  });

  it("ignores other events", async () => {
    const response = await POST(signedRequest("invoice.paid", { id: "in_1", object: "invoice" }));

    expect(response.status).toBe(200);
    expect(setSubscribed).not.toHaveBeenCalled();
  });

  it("rejects a bad signature with 400 and changes nothing", async () => {
    const response = await POST(
      signedRequest("customer.subscription.created", subscription("active"), "whsec_wrong"),
    );

    expect(response.status).toBe(400);
    expect(setSubscribed).not.toHaveBeenCalled();
  });

  it("rejects a request without a signature with 400", async () => {
    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(400);
  });
});
