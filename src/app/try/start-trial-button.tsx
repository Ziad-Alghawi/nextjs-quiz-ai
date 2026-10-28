"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";
import { authClient, authErrorMessage } from "@/lib/auth-client";

/** Signs in as a guest; the page then shows the trial. Only on a click, so crawlers start none. */
export function StartTrialButton() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>();

  async function start() {
    setStarting(true);
    setError(undefined);
    const result = await authClient.signIn.anonymous();
    if (result.error) {
      setError(authErrorMessage(result.error, "The trial couldn't start. Please try again."));
      setStarting(false);
      return;
    }
    // Stays "Starting…" until the page shows the trial.
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={() => void start()} disabled={starting} className="self-start">
        {starting ? <Spinner className="mr-2" /> : null}
        {starting ? "Starting…" : "Start trial"}
      </Button>
      <FormError>{error}</FormError>
    </div>
  );
}
