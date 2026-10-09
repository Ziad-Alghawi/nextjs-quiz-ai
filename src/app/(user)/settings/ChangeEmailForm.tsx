"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { useZodForm } from "@/hooks/use-zod-form";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import {
  confirmEmailChangeSchema,
  OTP_EXPIRES_IN_MINUTES,
  OTP_LENGTH,
  requestEmailChangeSchema,
} from "@/lib/validations/auth";

/** Changes the email in two steps: request a code for the new address, then enter it. */
export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Set once a code was requested; the second step confirms this address.
  const [newEmail, setNewEmail] = useState<string | null>(null);
  const [changedTo, setChangedTo] = useState<string | null>(null);

  const codeRequest = useZodForm(requestEmailChangeSchema, async (data) => {
    if (data.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      return { fieldErrors: { newEmail: "This is already your email address." } };
    }
    const { error } = await authClient.emailOtp.requestEmailChange(data);
    if (error)
      return { error: authErrorMessage(error, "Sending the code failed. Please try again.") };
    setNewEmail(data.newEmail);
  });

  const confirmation = useZodForm(confirmEmailChangeSchema, async ({ otp }) => {
    if (!newEmail) return;
    const { error } = await authClient.emailOtp.changeEmail({ newEmail, otp });
    if (error) {
      return {
        error: authErrorMessage(
          error,
          "This code is wrong or has expired. Check it or request a new one.",
        ),
      };
    }
    close();
    setChangedTo(newEmail);
    router.refresh();
  });
  const error = codeRequest.error ?? confirmation.error;

  function close() {
    setOpen(false);
    setNewEmail(null);
    codeRequest.reset();
    confirmation.reset();
  }

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
        <form onSubmit={codeRequest.onSubmit} noValidate className="flex flex-col gap-3">
          <p className="text-sm">
            We&apos;ll send a {OTP_LENGTH}-digit code to the new address. After the change you sign
            in with it.
          </p>
          <TextField
            label="New email"
            name="newEmail"
            type="email"
            autoComplete="email"
            error={codeRequest.errors.newEmail}
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={codeRequest.pending}>
              {codeRequest.pending ? "Sending…" : "Send code"}
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={confirmation.onSubmit} noValidate className="flex flex-col gap-3">
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
            error={confirmation.errors.otp}
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={confirmation.pending}>
              {confirmation.pending ? "Confirming…" : "Confirm new email"}
            </Button>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      <FormError>{error}</FormError>
    </div>
  );
}
