"use client";
import { Trash2 } from "lucide-react";
import { deleteChapter } from "@/app/actions/chapters";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { DialogButton } from "@/components/dialog-button";

type Chapter = { id: number; name: string };

export function DeleteChapterButton({ chapter }: { chapter: Chapter }) {
  return (
    <DialogButton
      variant="ghost"
      size="icon"
      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
      aria-label={`Delete ${chapter.name}`}
      dialogLabel="Delete chapter"
      dialog={(close) => (
        <ConfirmDeleteForm
          title={`Delete “${chapter.name}”?`}
          field={{ name: "chapterId", value: chapter.id }}
          submitLabel="Delete chapter"
          action={deleteChapter}
          onClose={close}
        >
          The chapter&apos;s text is removed. Quizzes already made from it are kept.
        </ConfirmDeleteForm>
      )}
    >
      <Trash2 className="size-4" aria-hidden />
    </DialogButton>
  );
}
