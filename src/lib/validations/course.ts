import { z } from "zod";
import { idSchema } from "./id";

export const courseNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a course name.")
  .max(60, "Use at most 60 characters.");

export const courseIdSchema = idSchema;
export const chapterIdSchema = idSchema;
