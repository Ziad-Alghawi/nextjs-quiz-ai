import { describe, expect, it } from "vitest";
import { getQuotaErrorMessage } from "./gemini-errors";

const quotaError = (details: unknown[]) => ({
  statusCode: 429,
  data: { error: { code: 429, status: "RESOURCE_EXHAUSTED", details } },
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
    ["a server error", { statusCode: 500 }],
    ["a plain error", new Error("boom")],
    ["nothing", undefined],
  ])("returns null for %s", (_, error) => {
    expect(getQuotaErrorMessage(error)).toBeNull();
  });
});
