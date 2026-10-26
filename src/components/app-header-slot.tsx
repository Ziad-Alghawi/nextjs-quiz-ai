"use client";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";

const OWN_HEADER_SEGMENTS = ["(marketing)", "(auth)"];

/** Shows the app header everywhere except the marketing and auth pages, whose layouts have their own. */
export function AppHeaderSlot({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  return segment && OWN_HEADER_SEGMENTS.includes(segment) ? null : children;
}
