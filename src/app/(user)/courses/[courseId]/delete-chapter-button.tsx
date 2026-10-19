"use client";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteChapter } from "@/app/actions/chapters";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type Chapter = { id: number; name: string };

function DeleteForm({ chapter, onDone }: { chapter: Chapter; onDone: () => void }) {
  return (
    <ConfirmDeleteForm
      title={`Delete “${chapter.name}”?`}
      field={{ name: "chapterId", value: chapter.id }}
      submitLabel="Delete chapter"
      action={deleteChapter}
      onClose={onDone}
    >
      The chapter&apos;s text is removed. Quizzes already made from it are kept.
    </ConfirmDeleteForm>
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
