import type { Metadata } from "next";
import { Play } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { QuickQuizForm } from "@/components/quick-quiz-form";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { GUEST_TRIAL, MAX_PDF_MB } from "@/lib/plans";
import { formatOrList } from "@/lib/utils";
import { listQuizzes } from "@/server/services/quizzes";
import { getTrialUsage } from "@/server/services/usage";
import { getCurrentUser } from "@/server/session";
import { StartTrialButton } from "./start-trial-button";

export const metadata: Metadata = { title: "Try it free" };

const linkClass = "font-medium text-primary hover:underline";

/** The guest trial: an introduction before it starts, then the guest's quizzes and what is left. */
export default async function TryPage() {
  const user = await getCurrentUser();
  // Accounts have the full app; the trial is for visitors and guests.
  if (user && !user.isGuest) redirect("/quizzes/new");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeading>Try Quiz AI free</PageHeading>
      {user ? <GuestTrial userId={user.id} /> : <TrialIntro />}
    </main>
  );
}

function TrialIntro() {
  return (
    <Card>
      <CardTitle>No account needed</CardTitle>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          Make up to {GUEST_TRIAL.quizzes} quizzes from your own PDFs (up to {MAX_PDF_MB} MB), with{" "}
          {formatOrList(GUEST_TRIAL.questionCounts)} questions each.
        </li>
        <li>Every answer comes with an explanation.</li>
        <li>Sign up later and your trial quizzes come with you.</li>
      </ul>
      <StartTrialButton />
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className={linkClass}>
          Sign in
        </Link>
        . No PDF at hand?{" "}
        <Link href="/quizzes/sample" className={linkClass}>
          Try a sample quiz
        </Link>
        .
      </p>
    </Card>
  );
}

async function GuestTrial({ userId }: { userId: string }) {
  const [{ used, limit }, quizzes] = await Promise.all([
    getTrialUsage(userId),
    listQuizzes(userId),
  ]);
  const remaining = Math.max(limit - used, 0);

  return (
    <>
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-primary/5 px-4 py-3"
      >
        <p className="text-sm">
          <span className="font-semibold">
            {remaining} of {limit} trial quizzes left.
          </span>{" "}
          Sign up to keep your quizzes and make more.
        </p>
        <Button size="sm" asChild>
          <Link href="/sign-up">Sign up free</Link>
        </Button>
      </div>

      <Card>
        <CardTitle>Quiz from a PDF</CardTitle>
        {remaining > 0 ? (
          // The banner above already says how many are left.
          <QuickQuizForm counts={GUEST_TRIAL.questionCounts} />
        ) : (
          <p className="text-sm text-muted-foreground">
            You&apos;ve used your {limit} trial quizzes.{" "}
            <Link href="/sign-up" className={linkClass}>
              Create a free account
            </Link>{" "}
            to make more; these come with you.
          </p>
        )}
      </Card>

      <Card className="gap-2">
        <CardTitle>Your quizzes</CardTitle>
        {quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Quizzes you make appear here.</p>
        ) : (
          <ul className="divide-y">
            {quizzes.map((quiz) => (
              <li key={quiz.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1 truncate font-medium">{quiz.name}</span>
                <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
                  <Link href={`/quizzes/${quiz.id}`} aria-label={`Start ${quiz.name}`}>
                    <Play className="size-3.5" aria-hidden />
                    Start
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
