"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import {
  fieldErrors,
  OTP_EXPIRES_IN_MINUTES,
  OTP_LENGTH,
  PASSWORD_MIN_LENGTH,
  requestPasswordResetSchema,
  resetPasswordSchema,
  type FieldErrors,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

const formData = (event: FormEvent<HTMLFormElement>) =>
  Object.fromEntries(new FormData(event.currentTarget));

export default function ForgotPasswordPage() {
  const router = useRouter();
  // Set once a code was requested; the second step needs the same address.
  const [email, setEmail] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors<RequestPasswordResetInput & ResetPasswordInput>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = requestPasswordResetSchema.safeParse(formData(event));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setPending(true);
    const { error } = await authClient.emailOtp.requestPasswordReset(parsed.data);
    setPending(false);
    if (error)
      return setError(authErrorMessage(error, "Sending the code failed. Please try again."));
    setEmail(parsed.data.email);
  };

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;
    setError(null);
    const parsed = resetPasswordSchema.safeParse(formData(event));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setPending(true);
    const { error } = await authClient.emailOtp.resetPassword({ email, ...parsed.data });
    setPending(false);
    // Wrong, expired and used-up codes get one message; after 3 wrong tries a new code is needed.
    if (error) {
      return setError(
        authErrorMessage(
          error,
          "This code is wrong or has expired. Check it or request a new one.",
        ),
      );
    }
    router.push("/sign-in?notice=password-reset");
  };

  return (
    <main className="mx-auto mt-24 flex max-w-sm flex-col gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold">Reset your password</h1>
      {email === null ? (
        <form onSubmit={requestCode} noValidate className="flex flex-col gap-3">
          <p className="text-sm">We&apos;ll email you a {OTP_LENGTH}-digit code.</p>
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            error={errors.email}
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={resetPassword} noValidate className="flex flex-col gap-3">
          <p role="status" className="text-sm">
            If an account exists for {email}, we sent it a code. It expires in{" "}
            {OTP_EXPIRES_IN_MINUTES} minutes.
          </p>
          {/* Without a username field, browsers take the code box for one and fill in the email.
              This hidden field tells them the account, so they also save the new password for it. */}
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <TextField
            label="Code"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            error={errors.otp}
          />
          <TextField
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            error={errors.password}
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Set new password"}
          </Button>
          <Button type="button" variant="link" onClick={() => setEmail(null)}>
            Use another email or get a new code
          </Button>
        </form>
      )}
      {error ? (
        <p role="alert" className="text-red-500">
          {error}
        </p>
      ) : null}
      <p className="text-sm">
        <Link href="/sign-in" className="underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
