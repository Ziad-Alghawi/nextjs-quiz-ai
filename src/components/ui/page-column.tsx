import type { ReactNode } from "react";

/** The column for text pages (billing, settings): readable line lengths, centered on wide screens. */
export function PageColumn({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">{children}</div>;
}
