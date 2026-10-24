"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/ui/text-field";
import { useZodForm } from "@/hooks/use-zod-form";
import { GoogleSignIn } from "../google-sign-in";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { PASSWORD_MIN_LENGTH, signUpSchema } from "@/lib/validations/auth";

export function SignUpForm({ callbackURL }: { callbackURL: string }) {
  const router = useRouter();
  const {
    errors,
    error,
    setError,
    pending,
    onSubmit: signUp,
  } = useZodForm(signUpSchema, async (account) => {
    const { error } = await authClient.signUp.email(account);
    if (error) return { error: authErrorMessage(error, "Sign-up failed. Please try again.") };

    // An already registered email gets the same answer as a new one (see auth.ts), so this page
    // can't be used to find out who has an account. Everyone continues to the sign-in form.
    router.push(`/sign-in?notice=registered&callbackUrl=${encodeURIComponent(callbackURL)}`);
  });

  return (
    <>
      <form method="post" onSubmit={signUp} noValidate className="flex flex-col gap-4">
        <TextField label="Name" name="name" autoComplete="name" error={errors.name} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          error={errors.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          error={errors.password}
        />
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Spinner className="mr-2" />
              Creating account…
            </>
          ) : (
            "Sign up"
          )}
        </Button>
      </form>
      <GoogleSignIn callbackURL={callbackURL} onError={setError} />
      <FormError>{error}</FormError>
    </>
  );
}
