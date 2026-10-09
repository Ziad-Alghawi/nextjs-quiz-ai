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

/** The card's heading; `as` keeps the heading levels right when the card sits under a section heading. */
export function CardTitle({
  as: Heading = "h2",
  className,
  ...props
}: ComponentProps<"h2"> & { as?: "h2" | "h3" }) {
  return <Heading className={cn("text-lg font-semibold", className)} {...props} />;
}
