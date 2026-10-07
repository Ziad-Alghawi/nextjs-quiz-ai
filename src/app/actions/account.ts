"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { nameSchema } from "@/lib/validations/auth";
import { updateName } from "@/server/services/account";
import { requireUser } from "@/server/session";

export type FormState = { status: "idle" | "saved" } | { status: "error"; error: string };

/** Changes the signed-in user's display name (form action for useActionState). */
export async function saveName(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/settings");

  const parsed = z.object({ name: nameSchema }).safeParse({ name: formData.get("name") });
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };

  await updateName(user.id, parsed.data.name);
  // The header shows the name on every page.
  revalidatePath("/", "layout");
  return { status: "saved" };
}
