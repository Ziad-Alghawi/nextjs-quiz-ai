import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";

/** Sign-in, sign-up and password reset share one centered card, under a header with only the logo. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="mx-auto max-w-(--breakpoint-xl) px-4 py-2.5">
        <Logo />
      </header>
      <main className="flex justify-center px-4 py-12 sm:py-20">
        <Card className="w-full max-w-sm gap-6">{children}</Card>
      </main>
    </>
  );
}
