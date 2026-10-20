import { X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type PlayerTopBarProps = {
  name: string;
  /** A short note beside the name, e.g. that a practice round isn't saved. */
  tag?: string;
  exitHref: string;
  /** The accessible name of ✕. */
  exitLabel: string;
  /** Index of the question on screen, from 0. */
  index: number;
  answered: number;
  total: number;
};

/** The sticky bar above a quiz: ✕, the name, the progress bar and "Question X of Y". */
export function PlayerTopBar({
  name,
  tag,
  exitHref,
  exitLabel,
  index,
  answered,
  total,
}: PlayerTopBarProps) {
  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-180 items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0" asChild>
          <Link href={exitHref} aria-label={exitLabel}>
            <X className="size-5" aria-hidden />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h1 className="min-w-0 truncate text-sm font-medium">{name}</h1>
            {tag ? <span className="shrink-0 text-xs text-muted-foreground">{tag}</span> : null}
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <Progress value={(answered / total) * 100} label="Quiz progress" className="h-2" />
            <span className="shrink-0 text-sm text-muted-foreground">
              Question {index + 1} of {total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
