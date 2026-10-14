import { z } from "zod";

export const courseNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a course name.")
  .max(60, "Use at most 60 characters.");

export const courseIdSchema = z.coerce.number().int().positive();
