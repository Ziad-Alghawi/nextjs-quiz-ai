"use client";
import { FolderInput } from "lucide-react";
import { useId, useState } from "react";
import { moveQuiz } from "@/app/actions/quizzes";
import { DialogButton } from "@/components/dialog-button";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Spinner } from "@/components/ui/spinner";
import { useDialogForm } from "@/hooks/use-dialog-form";

type Item = { id: number; name: string };

function MoveQuizForm({
  quiz,
  courses,
  onClose,
}: {
  quiz: Item;
  courses: Item[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useDialogForm(moveQuiz, onClose);
  const selectId = useId();
  const [courseId, setCourseId] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold wrap-break-word">Move &ldquo;{quiz.name}&rdquo;</h2>
      {courses.length === 0 ? (
        <p className="text-sm">
          You have no courses yet. Create one with + next to Courses in the sidebar.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <input type="hidden" name="quizId" value={quiz.id} />
          <label htmlFor={selectId} className="text-sm font-medium">
            Course
          </label>
          <select
            id={selectId}
            name="courseId"
            required
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Choose a course
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">Its attempts move with it.</p>
        </div>
      )}
      <FormError>{state.status === "error" ? state.error : undefined}</FormError>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        {courses.length > 0 ? (
          <Button type="submit" disabled={pending || !courseId}>
            {pending ? (
              <>
                <Spinner className="mr-2" />
                Moving…
              </>
            ) : (
              "Move quiz"
            )}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** Opens a dialog that moves a quick quiz from the "My quizzes" folder into one of the courses. */
export function MoveQuizButton({ quiz, courses }: { quiz: Item; courses: Item[] }) {
  return (
    <DialogButton
      variant="ghost"
      size="sm"
      className="shrink-0 gap-1.5"
      aria-label={`Move ${quiz.name} to a course`}
      dialogLabel="Move quiz"
      dialog={(close) => <MoveQuizForm quiz={quiz} courses={courses} onClose={close} />}
    >
      <FolderInput className="size-3.5" aria-hidden />
      {/* Icon only on phones, so the quiz name keeps its width. */}
      <span className="hidden sm:inline">Move</span>
    </DialogButton>
  );
}
