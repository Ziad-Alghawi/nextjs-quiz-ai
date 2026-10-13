import type { ReactNode } from "react";

/** The page's <h1>, with an optional action (e.g. a button) on the right. */
export function PageHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">{children}</h1>
      {action}
    </div>
  );
}
