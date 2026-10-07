"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import {
  fieldErrors,
  safeReturnPath,
  signInSchema,
  type FieldErrors,
  type SignInInput,
} from "@/lib/validations/auth";

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
  searchParams: Promise<{ callbackUrl?: string | string[]; notice?: string }>;
}) {
  const params = use(searchParams);
  const callbackURL = safeReturnPath(params.callbackUrl);
  const notice = params.notice ? notices.get(params.notice) : undefined;
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors<SignInInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signInWithEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setPending(true);
    const { error } = await authClient.signIn.email(parsed.data);
    setPending(false);
    if (error) return setError(authErrorMessage(error, "Invalid email or password."));

    router.replace(callbackURL);
    router.refresh();
  };

  const signInWithGoogle = async () => {
    setError(null);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL });
    if (error) setError("Google sign-in failed. Please try again.");
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
      {error ? (
        <p role="alert" className="text-red-500">
          {error}
        </p>
      ) : null}
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
