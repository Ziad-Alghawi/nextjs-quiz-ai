"use client";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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
          <Spinner className="mr-2" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
