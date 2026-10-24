"use client";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useState } from "react";
import { createCourse } from "@/app/actions/courses";
import { DialogFormActions } from "@/components/dialog-form-actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextField } from "@/components/ui/text-field";
import { IDLE, type FormState } from "@/lib/form-state";

function NewCourseForm({ onCancel }: { onCancel: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(createCourse, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold">New course</h2>
      <TextField
        label="Course name"
        name="name"
        autoComplete="off"
        autoFocus
        error={state.status === "error" ? state.error : undefined}
      />
      <DialogFormActions onCancel={onCancel}>
        <SubmitButton pendingText="Creating…">Create course</SubmitButton>
      </DialogFormActions>
    </form>
  );
}

/** The "+" next to the course list. The dialog closes by itself when the new course's page opens. */
export function NewCourseButton() {
  const pathname = usePathname();
  // Remembering where it was opened closes it on any navigation, without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="New course"
        onClick={() => setOpenedAt(pathname)}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
      <Dialog open={open} onClose={() => setOpenedAt(null)} label="New course">
        {/* Mounted only while open, so every opening starts with an empty form and no old error. */}
        {open ? <NewCourseForm onCancel={() => setOpenedAt(null)} /> : null}
      </Dialog>
    </>
  );
}
