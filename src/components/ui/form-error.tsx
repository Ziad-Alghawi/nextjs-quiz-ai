import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A form-level error message; renders nothing without one, and is announced when it appears. */
export function FormError({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className={cn("text-sm text-destructive", className)}>
      {children}
    </p>
  );
}
