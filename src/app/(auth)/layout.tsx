import { Card } from "@/components/ui/card";

/** Sign-in, sign-up and password reset share one centered card. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex justify-center px-4 py-12 sm:py-20">
      <Card className="w-full max-w-sm gap-6">{children}</Card>
    </main>
  );
}
