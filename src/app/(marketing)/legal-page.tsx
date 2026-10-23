import type { ReactNode } from "react";

/** A plain text page (privacy policy, Impressum): its headings and paragraphs are styled here. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-2 [&_p]:mt-3 [&_p,&_ul]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {children}
    </main>
  );
}

/** The only public contact: an email address would be scraped from a public legal page. */
export function ContactLink() {
  return (
    <>
      Contact:{" "}
      <a
        href="https://www.linkedin.com/in/ziad-alghawi-179726289"
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground underline underline-offset-4"
      >
        LinkedIn
      </a>
    </>
  );
}
