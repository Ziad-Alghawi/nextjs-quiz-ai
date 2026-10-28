import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { shareTokenSchema } from "@/lib/validations/quiz";
import { getSharedQuiz } from "@/server/services/shares";
import { getCurrentUser } from "@/server/session";
import { QuizPlayer } from "@/app/quizzes/quiz-player";
import { SaveCopyForm } from "./save-copy-form";

type Props = PageProps<"/shared/[token]">;

// The title and the page both need the quiz; cache() runs the lookup once per request.
const loadQuiz = cache(async (token: string) => {
  const parsed = shareTokenSchema.safeParse(token);
  // A link that was turned off is a 404 like one that never existed.
  const quiz = parsed.success ? await getSharedQuiz(parsed.data) : undefined;
  if (!quiz || quiz.questions.length === 0) notFound();
  return quiz;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const quiz = await loadQuiz((await params).token);
  // Only people with the link should find it, not search engines.
  return { title: quiz.name, robots: { index: false, follow: false } };
}

/** A quiz someone shared: anyone with the link can play it, without an account. */
export default async function SharedQuizPage({ params }: Props) {
  const { token } = await params;
  const [{ id, name, questions, ownerId }, user] = await Promise.all([
    loadQuiz(token),
    getCurrentUser(),
  ]);

  return (
    <>
      {user?.id === ownerId ? (
        <SharedQuizBar text="You shared this quiz.">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/quizzes/${id}`}>Open your quiz</Link>
          </Button>
        </SharedQuizBar>
      ) : user && !user.isGuest ? (
        <SharedQuizBar text="Shared quiz. Save a copy to keep your results; it goes to My quizzes.">
          <SaveCopyForm token={token} />
        </SharedQuizBar>
      ) : (
        // Visitors and guests: saving a copy needs an account.
        <SharedQuizBar text="Shared quiz. Your results aren't saved.">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/sign-in?callbackUrl=${encodeURIComponent(`/shared/${token}`)}`}>
              Sign in to save a copy
            </Link>
          </Button>
        </SharedQuizBar>
      )}
      {/* Only what the player needs: everything passed to a client component reaches the browser. */}
      <QuizPlayer quiz={{ id, name, questions }} exitHref="/" unsaved />
    </>
  );
}

/** A strip above the player that says whose quiz this is and how to keep it. */
function SharedQuizBar({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="border-b bg-muted/50">
      <div className="mx-auto flex w-full max-w-180 items-center gap-3 px-4 py-2">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">{text}</p>
        {children}
      </div>
    </div>
  );
}
