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
import { googleErrorMessage } from "@/lib/oauth-errors";
import { safeReturnPath, signInSchema } from "@/lib/validations/auth";

// Shown after another page sent the user here; unknown values show nothing.
const notices = new Map([
  ["registered", "Thanks for signing up. You can now sign in with your email and password."],
  [
    "password-reset",
    "Your password was changed and you were signed out everywhere. Sign in again.",
  ],
]);

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[]; notice?: string; error?: string }>;
}) {
  const params = use(searchParams);
  const callbackURL = safeReturnPath(params.callbackUrl);
  const notice = params.notice ? notices.get(params.notice) : undefined;
  const router = useRouter();
  const {
    errors,
    error,
    setError,
    pending,
    onSubmit: signInWithEmail,
  } = useZodForm(
    signInSchema,
    async (credentials) => {
      const { error } = await authClient.signIn.email(credentials);
      // Sign-up answers "thanks" even for a registered email (so it doesn't reveal accounts); people
      // who first used Google then land here without a password, so point them to their two options.
      if (error) {
        return {
          error: authErrorMessage(
            error,
            "Invalid email or password. If you signed up with Google, use Continue with Google, or Forgot password to set a password.",
          ),
        };
      }
      router.replace(callbackURL);
      router.refresh();
    },
    // Set when Google sent the user back here with an error.
    params.error ? googleErrorMessage(params.error) : null,
  );

  return (
    <>
      <AuthHeading
        title="Sign in"
        description="Welcome back. Sign in to continue with your quizzes."
      />
      {notice ? (
        <p role="status" className="rounded-md bg-secondary px-3 py-2 text-sm text-success">
          {notice}
        </p>
      ) : null}
      <form onSubmit={signInWithEmail} noValidate className="flex flex-col gap-4">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          error={errors.email}
        />
        <div className="flex flex-col gap-1">
          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            error={errors.password}
          />
          <Link
            href="/forgot-password"
            className="self-end text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <GoogleSignIn callbackURL={callbackURL} onError={setError} />
      <FormError>{error}</FormError>
      <p className="text-center text-sm text-muted-foreground">
        No account yet?{" "}
        <Link
          href={`/sign-up?callbackUrl=${encodeURIComponent(callbackURL)}`}
          className="font-medium text-primary hover:underline"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
