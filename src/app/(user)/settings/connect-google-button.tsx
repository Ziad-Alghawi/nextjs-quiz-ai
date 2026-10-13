"use client";
import { useState } from "react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { authClient } from "@/lib/auth-client";
import { googleErrorMessage } from "@/lib/oauth-errors";

/** Starts Google's sign-in; Better Auth links the Google account and returns to the settings page. */
export function ConnectGoogleButton() {
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setError(null);
    const { error } = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/settings",
      errorCallbackURL: "/settings",
    });
    if (error) setError(googleErrorMessage());
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" className="gap-2" onClick={connect}>
        <GoogleIcon className="size-4" />
        Connect Google
      </Button>
      <FormError>{error}</FormError>
    </div>
  );
}
