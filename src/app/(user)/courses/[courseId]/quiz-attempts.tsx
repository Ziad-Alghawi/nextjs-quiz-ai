import Link from "next/link";
import { pluralize } from "@/lib/pluralize";
import { scorePercent } from "@/lib/scoring";
import type { listCourseAttempts } from "@/server/services/attempts";
import { DeleteAttemptButton } from "./delete-attempt-button";

/** One quiz's entry of `listCourseAttempts`, or undefined when it has no attempts. */
type QuizEntry = ReturnType<Awaited<ReturnType<typeof listCourseAttempts>>["get"]>;

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

/** A quiz's attempts, newest first, behind a summary with the attempt count and the best score. */
export function QuizAttempts({ entry }: { entry: QuizEntry }) {
  if (!entry) return <p className="pb-3 text-sm text-muted-foreground">No attempts yet.</p>;

  const { attempts, best } = entry;
  return (
    <details className="pb-3">
      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
        {pluralize(attempts.length, "attempt")} · Best{" "}
        <span className="font-medium text-foreground">
          {scorePercent(best.score, best.totalQuestions)}%
        </span>
      </summary>
      <ul className="mt-2 divide-y rounded-md border">
        {attempts.map((attempt) => {
          const date = dateFormat.format(attempt.createdAt);
          return (
            <li key={attempt.id} className="flex items-center gap-3 py-1 pr-1 pl-3 text-sm">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
                <span className="whitespace-nowrap">{date}</span>
                {attempt.id === best.id ? (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    Best
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums">
                {attempt.score}/{attempt.totalQuestions} ·{" "}
                {scorePercent(attempt.score, attempt.totalQuestions)}%
              </span>
              <Link
                href={`/attempts/${attempt.id}`}
                className="shrink-0 rounded-md px-2 py-1.5 font-medium text-primary hover:bg-primary/10"
              >
                View
              </Link>
              <DeleteAttemptButton attempt={{ id: attempt.id, label: date }} />
            </li>
          );
        })}
      </ul>
    </details>
  );
}
