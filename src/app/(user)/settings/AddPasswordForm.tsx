"use client";
import { useActionState } from "react";
import { addPassword, type FormState } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { PASSWORD_MIN_LENGTH } from "@/lib/validations/auth";

export function AddPasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addPassword, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm">
        You sign in with Google. Add a password to also sign in with your email address.
      </p>
      {/* Lets password managers save the new password for this account. */}
      <input type="email" autoComplete="username" value={email} readOnly hidden />
      <TextField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
        error={state.status === "error" ? state.error : undefined}
      />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Adding…" : "Add password"}
      </Button>
    </form>
  );
}
