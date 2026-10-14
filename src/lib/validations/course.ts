import { z } from "zod";

export const courseNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a course name.")
  .max(60, "Use at most 60 characters.");

// Ids arrive as strings from forms and URLs.
const idSchema = z.coerce.number().int().positive();
export const courseIdSchema = idSchema;
export const chapterIdSchema = idSchema;
