"use client";
import { useActionState } from "react";
import { saveName, type FormState } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveName, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-col gap-3">
      <TextField
        label="Name"
        name="name"
        autoComplete="name"
        defaultValue={name}
        error={state.status === "error" ? state.error : undefined}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save name"}
        </Button>
        {state.status === "saved" && !pending ? (
          <p role="status" className="text-sm text-green-600">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
