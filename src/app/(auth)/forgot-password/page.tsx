"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { useZodForm } from "@/hooks/use-zod-form";
import { AuthHeading } from "../auth-heading";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import {
  OTP_EXPIRES_IN_MINUTES,
  OTP_LENGTH,
  PASSWORD_MIN_LENGTH,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  // Set once a code was requested; the second step needs the same address.
  const [email, setEmail] = useState<string | null>(null);
  const codeRequest = useZodForm(requestPasswordResetSchema, async (data) => {
    const { error } = await authClient.emailOtp.requestPasswordReset(data);
    if (error)
      return { error: authErrorMessage(error, "Sending the code failed. Please try again.") };
    setEmail(data.email);
  });

  const passwordReset = useZodForm(resetPasswordSchema, async (data) => {
    if (!email) return;
    const { error } = await authClient.emailOtp.resetPassword({ email, ...data });
    // Wrong, expired and used-up codes get one message; after 3 wrong tries a new code is needed.
    if (error) {
      return {
        error: authErrorMessage(
          error,
          "This code is wrong or has expired. Check it or request a new one.",
        ),
      };
    }
    router.push("/sign-in?notice=password-reset");
  });
  const error = codeRequest.error ?? passwordReset.error;

  return (
    <>
      <AuthHeading
        title="Reset your password"
        description={`We'll email you a ${OTP_LENGTH}-digit code to set a new password.`}
      />
      {email === null ? (
        <form onSubmit={codeRequest.onSubmit} noValidate className="flex flex-col gap-4">
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            error={codeRequest.errors.email}
          />
          <Button type="submit" disabled={codeRequest.pending}>
            {codeRequest.pending ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={passwordReset.onSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-md bg-secondary px-3 py-2 text-sm">
            <p role="status">
              If an account exists for {email}, we sent it a code. It expires in{" "}
              {OTP_EXPIRES_IN_MINUTES} minutes.
            </p>
            {/* Mail from a Gmail address without our own domain's SPF/DKIM often lands in spam. */}
            <p className="text-muted-foreground">
              Didn&apos;t get the email? Check your spam folder.
            </p>
          </div>
          {/* Without a username field, browsers take the code box for one and fill in the email.
              This hidden field tells them the account, so they also save the new password for it. */}
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <TextField
            label="Code"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            error={passwordReset.errors.otp}
          />
          <TextField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            error={passwordReset.errors.password}
          />
          <Button type="submit" disabled={passwordReset.pending}>
            {passwordReset.pending ? "Saving…" : "Set new password"}
          </Button>
          <Button type="button" variant="link" onClick={() => setEmail(null)}>
            Use another email or get a new code
          </Button>
        </form>
      )}
      <FormError>{error}</FormError>
      <p className="text-center text-sm">
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
