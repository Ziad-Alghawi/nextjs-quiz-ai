import type { ReactNode } from "react";
import { getCurrentUser } from "@/server/session";

/** A hint for guests on the sign-up and sign-in pages; nothing for anyone else. */
export async function GuestNote({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user?.isGuest) return null;
  return <p className="rounded-md bg-primary/5 px-3 py-2 text-sm">{children}</p>;
}
