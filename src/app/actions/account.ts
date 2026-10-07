"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { nameSchema, passwordSchema } from "@/lib/validations/auth";
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

/**
 * Adds a password to an account that signs in with Google only. Better Auth's setPassword has no HTTP
 * endpoint, hence a Server Action. It refuses accounts that already have a password: changing one
 * requires the current password.
 */
export async function addPassword(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser("/settings");

  const parsed = z.object({ password: passwordSchema }).safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };

  try {
    await auth.api.setPassword({
      body: { newPassword: parsed.data.password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return {
        status: "error",
        error: "Adding the password failed. Reload the page and try again.",
      };
    }
    throw error;
  }
  revalidatePath("/settings");
  return { status: "saved" };
}
