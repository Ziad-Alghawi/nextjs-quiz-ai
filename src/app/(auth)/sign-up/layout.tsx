import type { Metadata } from "next";

// The page is a client component, which can't export metadata.
export const metadata: Metadata = { title: "Create an account" };

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
