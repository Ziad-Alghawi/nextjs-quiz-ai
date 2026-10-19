import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { createUsers, deleteUsers } from "@/test/db-fixtures";
import { createCourse, deleteCourse, renameCourse } from "./courses";

const USER = "course-actions-db-test-user";

vi.mock("@/server/session", () => ({
  requireUser: async () => ({ id: USER, name: "Test", email: "test@example.com", image: null }),
}));
const { revalidatePath, redirect } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  // The real redirect() throws to end the action; the test only records where it went.
  redirect: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));

const IDLE = { status: "idle" } as const;
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const courseNamed = async (name: string) =>
  (await db.select().from(courses).where(eq(courses.userId, USER))).find((c) => c.name === name);

beforeEach(async () => {
  await createUsers(USER);
  vi.clearAllMocks();
});
afterAll(() => deleteUsers(USER));

describe("course actions", () => {
  it("create trims the name, refreshes the sidebar and opens the course", async () => {
    await createCourse(IDLE, form({ name: "  Biology  " }));

    const course = await courseNamed("Biology");
    expect(course).toBeDefined();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith(`/courses/${course!.id}`);
  });

  it("create explains invalid and duplicate names", async () => {
    expect(await createCourse(IDLE, form({ name: "   " }))).toEqual({
      status: "error",
      error: "Enter a course name.",
    });
    await createCourse(IDLE, form({ name: "Biology" }));
    redirect.mockClear();
    expect(await createCourse(IDLE, form({ name: "Biology" }))).toEqual({
      status: "error",
      error: "You already have a course with this name.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("rename changes the name; an unknown id is an error", async () => {
    await createCourse(IDLE, form({ name: "Biology" }));
    const { id } = (await courseNamed("Biology"))!;

    expect(await renameCourse(IDLE, form({ courseId: String(id), name: "Chemistry" }))).toEqual({
      status: "saved",
    });
    expect(await courseNamed("Chemistry")).toBeDefined();
    expect(await renameCourse(IDLE, form({ courseId: "999999999", name: "X" }))).toMatchObject({
      status: "error",
    });
  });

  it("delete removes the course and leaves for the dashboard", async () => {
    await createCourse(IDLE, form({ name: "Biology" }));
    const { id } = (await courseNamed("Biology"))!;

    await deleteCourse(IDLE, form({ courseId: String(id) }));
    expect(await courseNamed("Biology")).toBeUndefined();
    expect(redirect).toHaveBeenCalledWith("/dashboard");

    expect(await deleteCourse(IDLE, form({ courseId: "not-a-number" }))).toMatchObject({
      status: "error",
    });
  });
});
