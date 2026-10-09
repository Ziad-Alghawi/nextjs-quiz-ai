"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { useZodForm } from "@/hooks/use-zod-form";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { changePasswordSchema, PASSWORD_MIN_LENGTH } from "@/lib/validations/auth";

export function ChangePasswordForm({ email }: { email: string }) {
  const [saved, setSaved] = useState(false);
  const { errors, error, pending, onSubmit } = useZodForm(
    changePasswordSchema,
    async (passwords, form) => {
      // Signs out every other device; this one gets a new session cookie in the response.
      const { error } = await authClient.changePassword({
        ...passwords,
        revokeOtherSessions: true,
      });
      if (error?.code === "INVALID_PASSWORD") {
        return { fieldErrors: { currentPassword: "This isn't your current password." } };
      }
      if (error) {
        return {
          error: authErrorMessage(error, "Changing the password failed. Please try again."),
        };
      }
      form.reset();
      setSaved(true);
    },
  );

  return (
    <form
      onSubmit={(event) => {
        setSaved(false);
        return onSubmit(event);
      }}
      noValidate
      className="flex flex-col gap-3"
    >
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
      <FormError>{error}</FormError>
    </form>
  );
}
