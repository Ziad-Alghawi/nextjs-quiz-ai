import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "../auth-heading";
import { GuestNote } from "../guest-note";
import { safeReturnPath } from "@/lib/validations/auth";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const callbackURL = safeReturnPath((await searchParams).callbackUrl);

  return (
    <>
      <AuthHeading
        title="Create an account"
        description="Sign up for free and turn your PDFs into quizzes."
      />
      <GuestNote>
        Your trial quizzes are kept: after signing up, <strong>sign in on this device</strong> to
        move them to your account.
      </GuestNote>
      <SignUpForm callbackURL={callbackURL} />
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
