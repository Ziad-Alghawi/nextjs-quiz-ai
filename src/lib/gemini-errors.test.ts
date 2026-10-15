import { describe, expect, it } from "vitest";
import { getQuotaErrorMessage, isBillingStop } from "./gemini-errors";

const quotaError = (details: unknown[]) => ({
  statusCode: 429,
  data: {
    error: {
      code: 429,
      message: "Resource has been exhausted.",
      status: "RESOURCE_EXHAUSTED",
      details,
    },
  },
});

const quotaFailure = (quotaId: string) => ({
  "@type": "type.googleapis.com/google.rpc.QuotaFailure",
  violations: [{ quotaMetric: "generativelanguage.googleapis.com/x", quotaId, quotaValue: "20" }],
});

const retryInfo = (retryDelay: string) => ({
  "@type": "type.googleapis.com/google.rpc.RetryInfo",
  retryDelay,
});

describe("getQuotaErrorMessage", () => {
  it("says 'tomorrow' for the free tier's daily request limit (recorded Gemini response)", () => {
    const error = quotaError([
      { "@type": "type.googleapis.com/google.rpc.Help", links: [] },
      quotaFailure("GenerateRequestsPerDayPerProjectPerModel-FreeTier"),
      retryInfo("72362s"),
    ]);
    expect(getQuotaErrorMessage(error)).toBe(
      "The AI service has reached its limit for today. Please try again tomorrow.",
    );
  });

  it("gives the retry delay in seconds for a per-minute limit", () => {
    const error = quotaError([
      quotaFailure("GenerateRequestsPerMinutePerProjectPerModel-FreeTier"),
      retryInfo("33.6s"),
    ]);
    expect(getQuotaErrorMessage(error)).toBe(
      "The AI service is busy right now. Please try again in 34 seconds.",
    );
  });

  it("uses the singular for a one-second delay and minutes for long delays", () => {
    expect(getQuotaErrorMessage(quotaError([retryInfo("1s")]))).toMatch(/in 1 second\.$/);
    expect(getQuotaErrorMessage(quotaError([retryInfo("150s")]))).toMatch(/in 3 minutes\.$/);
  });

  it("falls back to a generic message when Gemini sends no details", () => {
    expect(getQuotaErrorMessage({ statusCode: 429 })).toBe(
      "The AI service is busy right now. Please try again shortly.",
    );
  });

  it("reads the fields from an Error instance, as LangChain throws them", () => {
    const error = Object.assign(new Error("quota"), quotaError([retryInfo("5s")]));
    expect(getQuotaErrorMessage(error)).toMatch(/in 5 seconds\.$/);
  });

  it.each([
    [
      "the spend cap (429)",
      { message: "Your billing account has exceeded its monthly spending cap." },
    ],
    ["used-up prepaid credits (429)", { message: "Your prepayment credits are depleted." }],
  ])("says generation is paused for %s", (_, error) => {
    expect(getQuotaErrorMessage({ statusCode: 429, data: { error } })).toBe(
      "Quiz generation is paused. Please try again later.",
    );
  });

  it.each([402, 403])("says generation is paused for a %i", (statusCode) => {
    expect(getQuotaErrorMessage({ statusCode, data: { error: { message: "billing" } } })).toBe(
      "Quiz generation is paused. Please try again later.",
    );
  });

  it.each([
    ["a server error", { statusCode: 500 }],
    ["a plain error", new Error("boom")],
    ["nothing", undefined],
  ])("returns null for %s", (_, error) => {
    expect(getQuotaErrorMessage(error)).toBeNull();
  });
});

describe("isBillingStop", () => {
  it("is true for a billing stop and false for a rate limit or another error", () => {
    expect(isBillingStop({ statusCode: 402 })).toBe(true);
    expect(isBillingStop({ statusCode: 429, data: { error: { message: "spending cap" } } })).toBe(
      true,
    );
    expect(isBillingStop(quotaError([retryInfo("5s")]))).toBe(false);
    expect(isBillingStop(new Error("fetch failed"))).toBe(false);
  });
});
