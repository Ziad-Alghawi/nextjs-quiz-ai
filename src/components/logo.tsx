import { Check } from "lucide-react";
import Link from "next/link";

/** The mark and name, linking home. Shared by the app header and the landing page's header. */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-xl font-bold">
      <span className="flex size-8 items-center justify-center rounded-lg bg-fill-blue text-on-fill">
        <Check className="size-4.5" strokeWidth={2.5} aria-hidden />
      </span>
      Quiz AI
    </Link>
  );
}
