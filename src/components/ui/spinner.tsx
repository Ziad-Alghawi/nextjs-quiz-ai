import type { ComponentProps } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A spinning loader icon; it stands still for people who prefer reduced motion. It has no margin of
 * its own, so callers add the spacing their layout needs. Lucide hides the icon from screen readers
 * unless an aria-label is passed.
 */
export function Spinner({ className, ...props }: ComponentProps<typeof Loader2>) {
  return <Loader2 {...props} className={cn("size-4 motion-safe:animate-spin", className)} />;
}
