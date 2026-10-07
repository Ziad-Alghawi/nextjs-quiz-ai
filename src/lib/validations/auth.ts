import { z } from "zod";

// Used by both the forms and auth.ts, so the browser checks the same rules as the server.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const OTP_LENGTH = 6;
export const OTP_EXPIRES_IN_MINUTES = 10;

const emailSchema = z.string().trim().email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter your name.")
  .max(100, "Use at most 100 characters.");

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

// No length rules here: a too-short password is simply wrong and gets the generic error.
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const requestPasswordResetSchema = z.object({ email: emailSchema });
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

const otpMessage = `Enter the ${OTP_LENGTH}-digit code from the email.`;
const otpSchema = z.string().trim().length(OTP_LENGTH, otpMessage).regex(/^\d+$/, otpMessage);

export const resetPasswordSchema = z.object({ otp: otpSchema, password: passwordSchema });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const requestEmailChangeSchema = z.object({ newEmail: emailSchema });
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>;

export const confirmEmailChangeSchema = z.object({ otp: otpSchema });
export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** The first message per field, for showing next to form inputs. */
export function fieldErrors<T>(error: z.ZodError<T>): FieldErrors<T> {
  const errors: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof T;
    errors[field] ??= issue.message;
  }
  return errors;
}

// Only same-site paths, so the link can't be used to send people to another website after sign-in.
export const safeReturnPath = (path: string | string[] | null | undefined) =>
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
