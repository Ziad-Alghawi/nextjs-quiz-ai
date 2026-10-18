"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NETWORK_ERROR, readGenerationResponse } from "@/lib/generation-response";

/**
 * State for a form that generates a quiz through a route handler: runs the request, opens the new
 * quiz, or reports the error. `generating` stays true until the quiz page replaces this one.
 */
export function useQuizGeneration() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [generating, setGenerating] = useState(false);

  async function generate(send: () => Promise<Response>) {
    setError(undefined);
    setGenerating(true);
    try {
      const result = await readGenerationResponse(await send());
      if ("href" in result) {
        // The browser keeps the server-rendered page (quiz list, quota counter) for the Back button;
        // a route handler can't invalidate that cache, so drop it here before leaving.
        router.refresh();
        router.push(result.href);
        return;
      }
      setError(result.error);
    } catch {
      setError(NETWORK_ERROR);
    }
    setGenerating(false);
  }

  return { error, setError, generating, generate };
}
