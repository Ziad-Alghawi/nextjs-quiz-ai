"use client";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { googleErrorMessage } from "@/lib/oauth-errors";

/**
 * An "or" divider and "Continue with Google". Google signs in existing users and creates new ones;
 * if it fails after the redirect, Better Auth sends the user back to the sign-in page with the error.
 */
export function GoogleSignIn({
  callbackURL,
  onError,
}: {
  callbackURL: string;
  onError: (message: string) => void;
}) {
  const continueWithGoogle = async () => {
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      errorCallbackURL: `/sign-in?callbackUrl=${encodeURIComponent(callbackURL)}`,
    });
    if (error) onError(googleErrorMessage());
  };

  return (
    <>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" className="gap-2" onClick={continueWithGoogle}>
        <GoogleIcon className="size-4" />
        Continue with Google
      </Button>
    </>
  );
}
