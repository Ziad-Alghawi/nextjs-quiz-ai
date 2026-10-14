"use client";
import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/account";
import { deleteChapter } from "@/app/actions/chapters";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";

type Chapter = { id: number; name: string };

function DeleteForm({ chapter, onDone }: { chapter: Chapter; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    async (previous, formData) => {
      const next = await deleteChapter(previous, formData);
      if (next.status === "saved") onDone();
      return next;
    },
    { status: "idle" },
  );

  return (
    <form action={action} className="flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold wrap-break-word">Delete “{chapter.name}”?</h2>
      <input type="hidden" name="chapterId" value={chapter.id} />
      <p className="text-sm">
        The chapter&apos;s text is removed. Quizzes already made from it are kept.
      </p>
      <FormError>{state.status === "error" ? state.error : undefined}</FormError>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete chapter"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteChapterButton({ chapter }: { chapter: Chapter }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${chapter.name}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} label="Delete chapter">
        {/* Mounted only while open, so each opening starts with fresh form state. */}
        {open ? <DeleteForm chapter={chapter} onDone={() => setOpen(false)} /> : null}
      </Dialog>
    </>
  );
}
