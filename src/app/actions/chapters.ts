"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/form-state";
import { chapterIdSchema } from "@/lib/validations/course";
import * as chapters from "@/server/services/chapters";
import { requireUser } from "@/server/session";

const NOT_FOUND = "This chapter doesn't exist anymore. Reload the page.";

/** Deletes a chapter; the quizzes made from it are kept. */
export async function deleteChapter(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard");

  const parsed = z.object({ chapterId: chapterIdSchema }).safeParse({
    chapterId: formData.get("chapterId"),
  });
  if (!parsed.success) return { status: "error", error: NOT_FOUND };

  const courseId = await chapters.deleteChapter(user.id, parsed.data.chapterId);
  if (courseId === null) return { status: "error", error: NOT_FOUND };
  revalidatePath(`/courses/${courseId}`);
  return { status: "saved" };
}
