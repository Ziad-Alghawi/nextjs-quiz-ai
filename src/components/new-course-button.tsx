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
  // Controlled, so a failed save keeps what was typed: React resets uncontrolled fields after
  // an action.
  const [name, setName] = useState("");

  return (
    <form action={action} className="flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold">New course</h2>
      <TextField
        label="Course name"
        name="name"
        autoComplete="off"
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={state.status === "error" ? state.error : undefined}
      />
      <DialogFormActions onCancel={onCancel}>
        <SubmitButton pendingText="Creating…">Create course</SubmitButton>
      </DialogFormActions>
    </form>
  );
}

/** Open state for the dialog; it closes by itself when the new course's page opens. */
export function useNewCourseDialog() {
  const pathname = usePathname();
  // Remembering where it was opened closes it on any navigation, without an effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  return {
    open: openedAt === pathname,
    show: () => setOpenedAt(pathname),
    close: () => setOpenedAt(null),
  };
}

export function NewCourseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} label="New course">
      {/* Mounted only while open, so every opening starts with an empty form and no old error. */}
      {open ? <NewCourseForm onCancel={onClose} /> : null}
    </Dialog>
  );
}

/**
 * The "+" next to the course list. With `onOpen` the caller shows the dialog itself, as the phone
 * menu does: the dialog can't sit inside the menu, which closes when the button is tapped.
 */
export function NewCourseButton({ onOpen }: { onOpen?: () => void }) {
  const dialog = useNewCourseDialog();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="New course"
        onClick={onOpen ?? dialog.show}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
      {onOpen ? null : <NewCourseDialog open={dialog.open} onClose={dialog.close} />}
    </>
  );
}
