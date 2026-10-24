"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/form-state";
import { MAX_COURSES_PER_USER } from "@/lib/plans";
import { courseIdSchema, courseNameSchema } from "@/lib/validations/course";
import * as courses from "@/server/services/courses";
import { requireUser } from "@/server/session";

const DUPLICATE_NAME = "You already have a course with this name.";
const NOT_FOUND = "This course doesn't exist anymore. Reload the page.";

const createSchema = z.object({ name: courseNameSchema });
const renameSchema = z.object({ courseId: courseIdSchema, name: courseNameSchema });
const deleteSchema = z.object({ courseId: courseIdSchema });

// The sidebar in the shared layout lists the courses.
const refreshCourses = () => revalidatePath("/", "layout");

/** Creates the course and opens its page; the form only ever sees an error. */
export async function createCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard");

  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };

  const result = await courses.createCourse(user.id, parsed.data.name);
  if ("error" in result) {
    return {
      status: "error",
      error:
        result.error === "duplicate"
          ? DUPLICATE_NAME
          : `You can have at most ${MAX_COURSES_PER_USER} courses.`,
    };
  }
  refreshCourses();
  redirect(`/courses/${result.courseId}`);
}

export async function renameCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard");

  const parsed = renameSchema.safeParse({
    courseId: formData.get("courseId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };

  const result = await courses.renameCourse(user.id, parsed.data.courseId, parsed.data.name);
  if ("error" in result) {
    return { status: "error", error: result.error === "duplicate" ? DUPLICATE_NAME : NOT_FOUND };
  }
  refreshCourses();
  return { status: "saved" };
}

/** Deletes the course with its chapters and quizzes, then leaves its (now missing) page. */
export async function deleteCourse(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard");

  const parsed = deleteSchema.safeParse({ courseId: formData.get("courseId") });
  if (!parsed.success) return { status: "error", error: NOT_FOUND };

  if (!(await courses.deleteCourse(user.id, parsed.data.courseId))) {
    return { status: "error", error: NOT_FOUND };
  }
  refreshCourses();
  redirect("/dashboard");
}
