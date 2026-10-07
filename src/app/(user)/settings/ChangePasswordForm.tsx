"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import {
  changePasswordSchema,
  fieldErrors,
  PASSWORD_MIN_LENGTH,
  type ChangePasswordInput,
  type FieldErrors,
} from "@/lib/validations/auth";

export function ChangePasswordForm({ email }: { email: string }) {
  const [errors, setErrors] = useState<FieldErrors<ChangePasswordInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setSaved(false);
    const parsed = changePasswordSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setPending(true);
    // Signs out every other device; this one gets a new session cookie in the response.
    const { error } = await authClient.changePassword({
      ...parsed.data,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) {
      if (error.code === "INVALID_PASSWORD") {
        return setErrors({ currentPassword: "This isn't your current password." });
      }
      return setError(authErrorMessage(error, "Changing the password failed. Please try again."));
    }
    form.reset();
    setSaved(true);
  };

  return (
    <form onSubmit={changePassword} noValidate className="flex flex-col gap-3">
      {/* Lets password managers update the saved password for this account. */}
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      <TextField
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword}
      />
      <TextField
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        error={errors.newPassword}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
        {saved ? (
          <p role="status" className="text-sm text-green-600">
            Password changed. Your other devices were signed out.
          </p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </form>
  );
}
