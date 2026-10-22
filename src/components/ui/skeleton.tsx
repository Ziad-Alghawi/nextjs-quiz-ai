import { cn } from "@/lib/utils";

/** A grey block that pulses in place of content that is still loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-muted", className)} />;
}
