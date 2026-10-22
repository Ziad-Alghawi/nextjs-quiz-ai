import { z } from "zod";
import { idSchema } from "./id";

/** The name of each user's folder for quick quizzes. */
export const DEFAULT_COURSE_NAME = "My quizzes";

export const courseNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a course name.")
  .max(60, "Use at most 60 characters.");

export const courseIdSchema = idSchema;
export const chapterIdSchema = idSchema;
