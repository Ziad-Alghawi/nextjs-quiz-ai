import { z } from "zod";

const baseSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID: z.string().startsWith("price_"),
  // Public base URL for links that leave the app (Stripe return URLs); a trailing slash is dropped.
  APP_URL: z
    .string()
    .url()
    .transform((url) => url.replace(/\/+$/, "")),
});

// Emails are printed to the server log by default (development); production sets EMAIL_TRANSPORT=smtp.
const emailSchema = z.discriminatedUnion("EMAIL_TRANSPORT", [
  z.object({ EMAIL_TRANSPORT: z.literal("console") }),
  z.object({
    EMAIL_TRANSPORT: z.literal("smtp"),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_USER: z.string().min(1),
    SMTP_PASSWORD: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
  }),
]);

const serverEnvSchema = baseSchema.and(emailSchema);

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function loadEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({ EMAIL_TRANSPORT: "console", ...process.env });
  if (parsed.success) return parsed.data;

  // CI and container image builds compile the app without secrets; the running server validates them.
  if (process.env.SKIP_ENV_VALIDATION === "true") return process.env as unknown as ServerEnv;

  const problems = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${problems}`);
}

export const env = loadEnv();
