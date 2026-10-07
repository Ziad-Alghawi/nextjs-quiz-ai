"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import {
  DELETE_CONFIRMATION,
  deleteAccountSchema,
  fieldErrors,
  type DeleteAccountInput,
  type FieldErrors,
} from "@/lib/validations/auth";

export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<DeleteAccountInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const deleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = deleteAccountSchema(hasPassword).safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setPending(true);
    // Without a password, Better Auth accepts only a session from the last 24 hours.
    const { error } = await authClient.deleteUser({ password: parsed.data.password });
    setPending(false);
    if (error) {
      if (error.code === "INVALID_PASSWORD") {
        return setErrors({ password: "This isn't your password." });
      }
      if (error.code === "SESSION_EXPIRED") {
        return setError("For your security, sign out and sign in again, then delete the account.");
      }
      return setError(
        authErrorMessage(error, "Your account was not deleted. Please try again later."),
      );
    }
    router.replace("/");
    router.refresh();
  };

  if (!open) {
    return (
      <Button variant="destructive" className="self-start" onClick={() => setOpen(true)}>
        Delete account
      </Button>
    );
  }

  return (
    <form onSubmit={deleteAccount} noValidate className="flex flex-col gap-3">
      <p className="text-sm">
        This permanently deletes your account, your quizzes and your results, and ends your Pro
        subscription right away. It can&apos;t be undone.
      </p>
      {hasPassword ? (
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
        />
      ) : null}
      <TextField
        label={`Type ${DELETE_CONFIRMATION} to confirm`}
        name="confirm"
        autoComplete="off"
        error={errors.confirm}
      />
      <div className="flex gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </form>
  );
}
