"use client";
import { Check, Copy, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { shareQuiz, stopSharingQuiz } from "@/app/actions/shares";
import { DialogButton } from "@/components/dialog-button";
import { DialogFormActions } from "@/components/dialog-form-actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";

type SharedQuiz = { id: number; name: string; shareToken: string | null };

function ShareQuizForm({ quiz, onClose }: { quiz: SharedQuiz; onClose: () => void }) {
  const router = useRouter();
  const [token, setToken] = useState(quiz.shareToken);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  // The dialog only mounts after a click, so this never runs on the server.
  const link = token ? `${window.location.origin}/shared/${token}` : null;

  // The list shows which quizzes are shared, so it is refreshed after each change.
  async function toggle() {
    setError(undefined);
    if (token) {
      const result = await stopSharingQuiz(quiz.id);
      if (result.status === "error") return setError(result.error);
      setToken(null);
      setCopied(false);
    } else {
      const result = await shareQuiz(quiz.id);
      if (result.status === "error") return setError(result.error);
      setToken(result.token);
    }
    router.refresh();
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <form action={toggle} className="flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold wrap-break-word">Share &ldquo;{quiz.name}&rdquo;</h2>
      <p className="text-sm">
        Anyone with the link can play this quiz without an account. Their results aren&apos;t saved,
        and you can turn the link off at any time.
      </p>
      {link ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextField
              label="Link"
              name="link"
              value={link}
              readOnly
              onFocus={(event) => event.target.select()}
            />
          </div>
          <Button type="button" onClick={() => void copy(link)} className="gap-2">
            {copied ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      ) : null}
      <DialogFormActions error={error} onCancel={onClose}>
        {link ? (
          <SubmitButton variant="outline" pendingText="Turning off…">
            Stop sharing
          </SubmitButton>
        ) : (
          <SubmitButton pendingText="Creating…">Create link</SubmitButton>
        )}
      </DialogFormActions>
    </form>
  );
}

/** Opens a dialog that creates the quiz's share link, copies it or turns it off. */
export function ShareQuizButton({ quiz }: { quiz: SharedQuiz }) {
  return (
    <DialogButton
      variant="ghost"
      size="sm"
      className="shrink-0 gap-1.5"
      aria-label={`Share ${quiz.name}`}
      dialogLabel="Share quiz"
      dialog={(close) => <ShareQuizForm quiz={quiz} onClose={close} />}
    >
      <Share2 className="size-3.5" aria-hidden />
      {/* Icon only on phones, so the quiz name keeps its width. */}
      <span className="hidden sm:inline">{quiz.shareToken ? "Shared" : "Share"}</span>
    </DialogButton>
  );
}
