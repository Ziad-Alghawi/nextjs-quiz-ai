"use client";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useActionState, useState } from "react";
import { createCourse } from "@/app/actions/courses";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { IDLE, type FormState } from "@/lib/form-state";

function NewCourseForm({ onCancel }: { onCancel: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCourse, IDLE);

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
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create course"}
        </Button>
      </div>
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
