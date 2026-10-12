"use client";

import "./globals.css";
import ErrorPage from "./error";

// Replaces the root layout when it fails itself, e.g. the header's session lookup while the
// database is down; error.tsx only catches errors below the layout.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <ErrorPage reset={reset} />
      </body>
    </html>
  );
}
