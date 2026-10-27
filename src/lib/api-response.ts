import { NextResponse } from "next/server";

// Every route handler fails with this body: the forms show `error` to the user as it is.
export const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

/** Courses, with their chapters and generating from them, are for accounts, not guests. */
export const COURSES_NEED_ACCOUNT = "Create an account to use courses.";
