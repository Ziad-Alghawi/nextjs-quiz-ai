"use client";
import { Pencil, Trash2 } from "lucide-react";
import { deleteCourse, renameCourse } from "@/app/actions/courses";
import { ConfirmDeleteForm } from "@/components/confirm-delete-form";
import { DialogButton } from "@/components/dialog-button";
import { Button } from "@/components/ui/button";
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

/** Rename and delete for the course page header. */
export function CourseActions({ course, chapterCount, quizCount }: CourseActionsProps) {
  return (
    <div className="flex gap-2">
      {/* Icon only on phones, so a long course name keeps its space. */}
      <DialogButton
        variant="outline"
        className="gap-2"
        aria-label="Rename course"
        dialogLabel="Rename course"
        dialog={(close) => <RenameForm course={course} onDone={close} />}
      >
        <Pencil className="size-4" aria-hidden />
        <span className="hidden sm:inline">Rename</span>
      </DialogButton>
      <DialogButton
        variant="outline"
        className="gap-2 text-destructive hover:text-destructive"
        aria-label="Delete course"
        dialogLabel="Delete course"
        dialog={(close) => (
          <ConfirmDeleteForm
            title={`Delete “${course.name}”?`}
            field={{ name: "courseId", value: course.id }}
            submitLabel="Delete course"
            action={deleteCourse}
            onClose={close}
          >
            This permanently deletes the course together with its{" "}
            <strong>{pluralize(chapterCount, "chapter")}</strong> and{" "}
            <strong>{pluralize(quizCount, "quiz", "quizzes")}</strong>, including the results saved
            for those quizzes. It can&apos;t be undone.
          </ConfirmDeleteForm>
        )}
      >
        <Trash2 className="size-4" aria-hidden />
        <span className="hidden sm:inline">Delete</span>
      </DialogButton>
    </div>
  );
}
