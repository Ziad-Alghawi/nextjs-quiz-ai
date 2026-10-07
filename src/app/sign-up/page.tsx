"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import {
  fieldErrors,
  PASSWORD_MIN_LENGTH,
  safeReturnPath,
  signUpSchema,
  type FieldErrors,
  type SignUpInput,
} from "@/lib/validations/auth";

export default function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const callbackURL = safeReturnPath(use(searchParams).callbackUrl);
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors<SignUpInput>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const signUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});

    setPending(true);
    const { error } = await authClient.signUp.email(parsed.data);
    setPending(false);
    if (error) return setError(authErrorMessage(error, "Sign-up failed. Please try again."));

    // An already registered email gets the same answer as a new one (see auth.ts), so this page
    // can't be used to find out who has an account. Everyone continues to the sign-in form.
    router.push(`/sign-in?notice=registered&callbackUrl=${encodeURIComponent(callbackURL)}`);
  };

  return (
    <main className="mx-auto mt-24 flex max-w-sm flex-col gap-4 px-4 text-center">
      <h1 className="text-3xl font-bold">Create an account</h1>
      <form onSubmit={signUp} noValidate className="flex flex-col gap-3">
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
      {error ? (
        <p role="alert" className="text-red-500">
          {error}
        </p>
      ) : null}
      <p className="text-sm">
        Already have an account?{" "}
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent(callbackURL)}`}
          className="underline"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
