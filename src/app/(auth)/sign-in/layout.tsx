import type { Metadata } from "next";

// The page is a client component, which can't export metadata.
export const metadata: Metadata = { title: "Sign in" };

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
