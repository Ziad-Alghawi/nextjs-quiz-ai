"use client";
import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

// Only same-site paths, so the link can't be used to send people to another website after sign-in.
const safeReturnPath = (path: string | string[] | undefined) =>
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const callbackURL = safeReturnPath(use(searchParams).callbackUrl);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setError(null);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL });
    if (error) setError("Google sign-in failed. Please try again.");
  };

  return (
    <main className="mx-auto mt-24 flex max-w-sm flex-col items-center gap-4 text-center">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <Button onClick={signInWithGoogle}>Continue with Google</Button>
      {error ? (
        <p role="alert" className="text-red-500">
          {error}
        </p>
      ) : null}
    </main>
  );
}
