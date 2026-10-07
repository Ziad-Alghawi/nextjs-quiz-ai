import { z } from "zod";

const QUOTA_FAILURE = "type.googleapis.com/google.rpc.QuotaFailure";
const RETRY_INFO = "type.googleapis.com/google.rpc.RetryInfo";

// The parts of Gemini's 429 response (google.rpc error details) that decide the message.
const quotaErrorSchema = z.object({
  statusCode: z.literal(429),
  data: z
    .object({
      error: z.object({
        details: z
          .array(
            z.object({
              "@type": z.string(),
              violations: z.array(z.object({ quotaId: z.string().optional() })).optional(),
              retryDelay: z.string().optional(),
            }),
          )
          .optional(),
      }),
    })
    .optional(),
});

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;

/** User-facing message for a Gemini quota error, or null if the error is not one. */
export function getQuotaErrorMessage(error: unknown): string | null {
  const parsed = quotaErrorSchema.safeParse(error);
  if (!parsed.success) return null;

  const details = parsed.data.data?.error.details ?? [];
  const quotaIds = details
    .filter((detail) => detail["@type"] === QUOTA_FAILURE)
    .flatMap((detail) => detail.violations ?? [])
    .map((violation) => violation.quotaId ?? "");

  // Daily quotas (e.g. "GenerateRequestsPerDayPerProjectPerModel-FreeTier") only reset the next day.
  if (quotaIds.some((id) => id.includes("PerDay"))) {
    return "The AI service has reached its limit for today. Please try again tomorrow.";
  }

  // retryDelay is a protobuf Duration such as "34s" or "1.5s".
  const retryDelay = details.find((detail) => detail["@type"] === RETRY_INFO)?.retryDelay;
  const seconds = Math.ceil(Number.parseFloat(retryDelay ?? ""));
  if (Number.isFinite(seconds) && seconds > 0) {
    const wait =
      seconds < 120 ? plural(seconds, "second") : plural(Math.ceil(seconds / 60), "minute");
    return `The AI service is busy right now. Please try again in ${wait}.`;
  }

  return "The AI service is busy right now. Please try again shortly.";
}
