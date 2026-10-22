import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/session";

const sections = [
  { href: "/#how", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
];

const footerLinks = [
  { href: "https://github.com/Ziad-Alghawi/nextjs-quiz-ai", label: "GitHub" },
  { href: "/privacy", label: "Privacy" },
  { href: "/impressum", label: "Impressum" },
];

/** The landing and legal pages: a header with the page sections instead of the app header, and a footer. */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Logo />
        <nav aria-label="Sections" className="hidden gap-7 text-muted-foreground md:flex">
          {sections.map((section) => (
            <Link key={section.href} href={section.href} className="hover:text-primary">
              {section.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2">
          {user ? (
            <Button className="rounded-full px-5" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" className="rounded-full" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button className="rounded-full px-5" asChild>
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      {children}

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <p>© {new Date().getFullYear()} Quiz AI · Built by Ziad Alghawi</p>
          <nav aria-label="Footer" className="flex gap-6">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}
