import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFoundPage() {
  return (
    <main className="flex flex-col items-center gap-4 p-10 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        This page doesn&apos;t exist, or it belongs to another account.
      </p>
      <Button asChild>
        <Link href="/">Go to the home page</Link>
      </Button>
    </main>
  );
}
