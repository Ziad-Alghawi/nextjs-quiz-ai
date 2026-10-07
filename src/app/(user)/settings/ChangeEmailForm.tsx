"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import {
  confirmEmailChangeSchema,
  fieldErrors,
  OTP_EXPIRES_IN_MINUTES,
  OTP_LENGTH,
  requestEmailChangeSchema,
  type ConfirmEmailChangeInput,
  type FieldErrors,
  type RequestEmailChangeInput,
} from "@/lib/validations/auth";

const formData = (event: FormEvent<HTMLFormElement>) =>
  Object.fromEntries(new FormData(event.currentTarget));

/** Changes the email in two steps: request a code for the new address, then enter it. */
export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Set once a code was requested; the second step confirms this address.
  const [newEmail, setNewEmail] = useState<string | null>(null);
  const [errors, setErrors] = useState<
    FieldErrors<RequestEmailChangeInput & ConfirmEmailChangeInput>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [changedTo, setChangedTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const close = () => {
    setOpen(false);
    setNewEmail(null);
    setErrors({});
    setError(null);
  };

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = requestEmailChangeSchema.safeParse(formData(event));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    if (parsed.data.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      return setErrors({ newEmail: "This is already your email address." });
    }
    setErrors({});

    setPending(true);
    const { error } = await authClient.emailOtp.requestEmailChange(parsed.data);
    setPending(false);
    if (error)
      return setError(authErrorMessage(error, "Sending the code failed. Please try again."));
    setNewEmail(parsed.data.newEmail);
  };

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newEmail) return;
    setError(null);
    const parsed = confirmEmailChangeSchema.safeParse(formData(event));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setPending(true);
    const { error } = await authClient.emailOtp.changeEmail({ newEmail, otp: parsed.data.otp });
    setPending(false);
    if (error) {
      return setError(
        authErrorMessage(
          error,
          "This code is wrong or has expired. Check it or request a new one.",
        ),
      );
    }
    close();
    setChangedTo(newEmail);
    router.refresh();
  };

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-2">
        {changedTo ? (
          <p role="status" className="text-sm text-green-600">
            Your email is now {changedTo}. Use it to sign in.
          </p>
        ) : null}
        <Button variant="outline" onClick={() => setOpen(true)}>
          Change email
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {newEmail === null ? (
        <form onSubmit={requestCode} noValidate className="flex flex-col gap-3">
          <p className="text-sm">
            We&apos;ll send a {OTP_LENGTH}-digit code to the new address. After the change you sign
            in with it.
          </p>
          <TextField
            label="New email"
            name="newEmail"
            type="email"
            autoComplete="email"
            error={errors.newEmail}
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send code"}
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={confirm} noValidate className="flex flex-col gap-3">
          {/* Addresses that already belong to an account get no code, without saying so here. */}
          <p role="status" className="text-sm">
            If {newEmail} isn&apos;t used by another account, we sent it a code. It expires in{" "}
            {OTP_EXPIRES_IN_MINUTES} minutes.
          </p>
          <p className="text-sm text-muted-foreground">
            Didn&apos;t get the email? Check your spam folder.
          </p>
          <TextField
            label="Code"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            error={errors.otp}
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Confirming…" : "Confirm new email"}
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {error ? (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}
