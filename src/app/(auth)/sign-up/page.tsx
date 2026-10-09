"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { useZodForm } from "@/hooks/use-zod-form";
import { AuthHeading } from "../auth-heading";
import { GoogleSignIn } from "../google-sign-in";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { PASSWORD_MIN_LENGTH, safeReturnPath, signUpSchema } from "@/lib/validations/auth";

export default function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const callbackURL = safeReturnPath(use(searchParams).callbackUrl);
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
      <AuthHeading
        title="Create an account"
        description="Sign up for free and turn your PDFs into quizzes."
      />
      <form onSubmit={signUp} noValidate className="flex flex-col gap-4">
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
          {pending ? "Creating account…" : "Sign up"}
        </Button>
      </form>
      <GoogleSignIn callbackURL={callbackURL} onError={setError} />
      <FormError>{error}</FormError>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent(callbackURL)}`}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
