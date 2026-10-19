import { z } from "zod";
import { pluralize } from "@/lib/pluralize";

const QUOTA_FAILURE = "type.googleapis.com/google.rpc.QuotaFailure";
const RETRY_INFO = "type.googleapis.com/google.rpc.RetryInfo";

// The parts of Gemini's error response (google.rpc error details) that decide the message.
const quotaErrorSchema = z.object({
  statusCode: z.union([z.literal(402), z.literal(403), z.literal(429)]),
  data: z
    .object({
      error: z.object({
        message: z.string().optional(),
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

// 402: prepaid credits used up (Google's billing docs). 429 with this text: the spend cap was reached.
// 403: the project lost API access, e.g. billing stopped. Waiting a minute or another model won't help.
const BILLING_STOP = /spending cap|prepayment credits/i;

/** Whether billing stopped the Gemini API (spend cap, used-up credits): every model is paused. */
export function isBillingStop(error: unknown) {
  const parsed = quotaErrorSchema.safeParse(error);
  if (!parsed.success) return false;
  const { statusCode, data } = parsed.data;
  return statusCode !== 429 || BILLING_STOP.test(data?.error.message ?? "");
}

/** User-facing message for a Gemini quota or billing error, or null if the error is not one. */
export function getQuotaErrorMessage(error: unknown): string | null {
  const parsed = quotaErrorSchema.safeParse(error);
  if (!parsed.success) return null;

  if (isBillingStop(error)) return "Quiz generation is paused. Please try again later.";

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
      seconds < 120 ? pluralize(seconds, "second") : pluralize(Math.ceil(seconds / 60), "minute");
    return `The AI service is busy right now. Please try again in ${wait}.`;
  }

  return "The AI service is busy right now. Please try again shortly.";
}
