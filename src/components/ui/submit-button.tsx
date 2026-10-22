"use client";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** A form's submit button that disables itself and shows a spinner while the action runs. */
export function SubmitButton({
  children,
  pendingText,
  variant,
  disabled = false,
  className,
}: {
  children: ReactNode;
  pendingText: string;
  variant?: ComponentProps<typeof Button>["variant"];
  /** Disabled for a reason of the form's own, e.g. a choice that can't be submitted. */
  disabled?: boolean;
  className?: string;
}) {
  // useFormStatus only works in a component rendered inside the form.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending || disabled} className={className}>
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 motion-safe:animate-spin" aria-hidden />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
