"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";
import { TextField } from "@/components/ui/text-field";
import { useZodForm } from "@/hooks/use-zod-form";
import { GoogleSignIn } from "../google-sign-in";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { signInSchema } from "@/lib/validations/auth";

export function SignInForm({
  callbackURL,
  initialError,
}: {
  callbackURL: string;
  initialError: string | null;
}) {
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
    initialError,
  );

  return (
    <>
      <form method="post" onSubmit={signInWithEmail} noValidate className="flex flex-col gap-4">
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
        <FormError>{error}</FormError>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Spinner className="mr-2" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
      <GoogleSignIn callbackURL={callbackURL} onError={setError} />
    </>
  );
}
