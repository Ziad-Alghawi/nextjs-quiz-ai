"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { TextField } from "@/components/ui/text-field";
import { useZodForm } from "@/hooks/use-zod-form";
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

  const signInWithGoogle = async () => {
    setError(null);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: `/sign-in?callbackUrl=${encodeURIComponent(callbackURL)}`,
    });
    if (error) setError(googleErrorMessage());
  };

  return (
    <main className="mx-auto mt-24 flex max-w-sm flex-col gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold">Sign in</h1>
      {notice ? (
        <p role="status" className="text-green-600">
          {notice}
        </p>
      ) : null}
      <form onSubmit={signInWithEmail} noValidate className="flex flex-col gap-3">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          error={errors.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
        />
        <Link href="/forgot-password" className="self-end text-sm underline">
          Forgot password?
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <Button variant="outline" onClick={signInWithGoogle}>
        Continue with Google
      </Button>
      <FormError>{error}</FormError>
      <p className="text-sm">
        No account yet?{" "}
        <Link
          href={`/sign-up?callbackUrl=${encodeURIComponent(callbackURL)}`}
          className="underline"
        >
          Sign up
        </Link>
      </p>
    </main>
  );
}
