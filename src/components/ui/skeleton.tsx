import { cn } from "@/lib/utils";

/**
 * A grey block in place of content that is still loading. It pulses, unless the system is set to
 * reduce motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)} />
  );
}
