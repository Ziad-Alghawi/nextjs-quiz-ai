"use client";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteCourse, renameCourse } from "@/app/actions/courses";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { useDialogForm } from "@/hooks/use-dialog-form";
import { pluralize } from "@/lib/pluralize";

type CourseActionsProps = {
  course: { id: number; name: string };
  chapterCount: number;
  quizCount: number;
};

function RenameForm({
  course,
  onDone,
}: {
  course: CourseActionsProps["course"];
  onDone: () => void;
}) {
  const [state, action, pending] = useDialogForm(renameCourse, onDone);

  return (
    <form action={action} className="flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold">Rename course</h2>
      <input type="hidden" name="courseId" value={course.id} />
      <TextField
        label="Course name"
        name="name"
        autoComplete="off"
        autoFocus
        defaultValue={course.name}
        error={state.status === "error" ? state.error : undefined}
      />
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function DeleteForm({
  course,
  chapterCount,
  quizCount,
  onCancel,
}: CourseActionsProps & { onCancel: () => void }) {
  return (
    <ConfirmDeleteForm
      title={`Delete “${course.name}”?`}
      field={{ name: "courseId", value: course.id }}
      submitLabel="Delete course"
      action={deleteCourse}
      onClose={onCancel}
    >
      This permanently deletes the course together with its{" "}
      <strong>{pluralize(chapterCount, "chapter")}</strong> and{" "}
      <strong>{pluralize(quizCount, "quiz", "quizzes")}</strong>, including the results saved for
      those quizzes. It can&apos;t be undone.
    </ConfirmDeleteForm>
  );
}

/** Rename and delete for the course page header. */
export function CourseActions(props: CourseActionsProps) {
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <div className="flex gap-2">
        {/* Icon only on phones, so a long course name keeps its space. */}
        <Button
          variant="outline"
          className="gap-2"
          aria-label="Rename course"
          onClick={() => setDialog("rename")}
        >
          <Pencil className="size-4" aria-hidden />
          <span className="hidden sm:inline">Rename</span>
        </Button>
        <Button
          variant="outline"
          className="gap-2 text-destructive hover:text-destructive"
          aria-label="Delete course"
          onClick={() => setDialog("delete")}
        >
          <Trash2 className="size-4" aria-hidden />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>
      {/* Mounted only while open, so each opening starts with fresh form state. */}
      <Dialog open={dialog === "rename"} onClose={close} label="Rename course">
        {dialog === "rename" ? <RenameForm course={props.course} onDone={close} /> : null}
      </Dialog>
      <Dialog open={dialog === "delete"} onClose={close} label="Delete course">
        {dialog === "delete" ? <DeleteForm {...props} onCancel={close} /> : null}
      </Dialog>
    </>
  );
}
