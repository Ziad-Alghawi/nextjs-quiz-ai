import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "../auth-heading";
import { GuestNote } from "../guest-note";
import { googleErrorMessage } from "@/lib/oauth-errors";
import { safeReturnPath } from "@/lib/validations/auth";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

// Shown after another page sent the user here; unknown values show nothing.
const notices = new Map([
  [
    "registered",
    // Sign-up answers a registered email like a new one; the owner gets an email instead.
    "Thanks for signing up. You can now sign in with your email and password. If this email already had an account, we've emailed you how to sign in (check your spam folder).",
  ],
  [
    "password-reset",
    "Your password was changed and you were signed out everywhere. Sign in again.",
  ],
]);

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const callbackURL = safeReturnPath(params.callbackUrl);
  // A repeated ?notice= arrives as an array and shows nothing, like an unknown value.
  const notice = typeof params.notice === "string" ? notices.get(params.notice) : undefined;

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
      <GuestNote>Signing in moves your trial quizzes to your account.</GuestNote>
      <SignInForm
        callbackURL={callbackURL}
        // Set when Google sent the user back here with an error.
        initialError={params.error ? googleErrorMessage(params.error) : null}
      />
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
