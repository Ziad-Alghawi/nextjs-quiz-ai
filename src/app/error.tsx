"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();

  // reset() alone only re-renders on the client; refresh() also refetches the server data that failed.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground">
        This page couldn&apos;t be loaded. The service may be temporarily unavailable, so please try again in a moment.
      </p>
      <Button onClick={retry}>Try again</Button>
    </main>
  );
}
