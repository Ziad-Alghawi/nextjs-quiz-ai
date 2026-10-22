"use client";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";

/** Shows the app header everywhere except the marketing pages, whose layout has its own header. */
export function AppHeaderSlot({ children }: { children: ReactNode }) {
  return useSelectedLayoutSegment() === "(marketing)" ? null : children;
}
