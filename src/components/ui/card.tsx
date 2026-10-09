import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** A white surface with a border, used for page sections and the auth forms. */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}
