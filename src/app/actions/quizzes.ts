"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/lib/form-state";
import { courseIdSchema } from "@/lib/validations/course";
import { quizIdSchema } from "@/lib/validations/quiz";
import { moveQuizToCourse } from "@/server/services/quizzes";
import { requireAccount } from "@/server/session";

const NOT_FOUND = "This quiz or course doesn't exist anymore. Reload the page.";

const moveSchema = z.object({ quizId: quizIdSchema, courseId: courseIdSchema });

/** Moves a quick quiz from the "My quizzes" folder into a course the user picked. */
export async function moveQuiz(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccount("/dashboard");

  const parsed = moveSchema.safeParse({
    quizId: formData.get("quizId"),
    courseId: formData.get("courseId"),
  });
  if (!parsed.success) return { status: "error", error: NOT_FOUND };

  if (!(await moveQuizToCourse(user.id, parsed.data.quizId, parsed.data.courseId))) {
    return { status: "error", error: NOT_FOUND };
  }
  // The folder, the course and the Overview's course column all change.
  revalidatePath("/", "layout");
  return { status: "saved" };
}
