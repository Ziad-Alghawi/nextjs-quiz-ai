import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { chapters, courses, rateLimits, users } from "@/db/schema";
import {
  CHAPTER_UPLOAD_LIMIT,
  MAX_CHAPTERS_PER_COURSE,
  MAX_DOCUMENT_CHARS,
  PLANS,
} from "@/lib/plans";
import { makePdf } from "@/test/make-pdf";
import { POST } from "./route";

const USER = "chapter-upload-db-test-user";
const OTHER_USER = "chapter-upload-db-test-other";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@/server/session", () => ({
  getCurrentUser: async () =>
    session.userId
      ? { id: session.userId, name: "Test", email: "t@example.com", image: null }
      : null,
}));

const upload = async (courseId: number | string, file: Blob | null, fileName = "chapter-1.pdf") => {
  const form = new FormData();
  if (file) form.set("pdf", file, fileName);
  const response = await POST(
    new Request(`http://localhost/api/courses/${courseId}/sources`, { method: "POST", body: form }),
    { params: Promise.resolve({ courseId: String(courseId) }) },
  );
  return {
    status: response.status,
    body: (await response.json()) as { id?: number; error?: string },
  };
};

const newCourse = async (userId: string, name = "Biology") => {
  const [course] = await db.insert(courses).values({ userId, name }).returning({ id: courses.id });
  return course.id;
};
const addChapters = (courseId: number, count: number) =>
  db.insert(chapters).values(
    Array.from({ length: count }, (_, i) => ({
      courseId,
      name: `old-${i}.pdf`,
      text: "Old text.",
      pageCount: 1,
      sizeBytes: 100,
    })),
  );

const cleanUp = async () => {
  await db.delete(users).where(inArray(users.id, [USER, OTHER_USER]));
  await db
    .delete(rateLimits)
    .where(like(rateLimits.key, "chapter-upload:chapter-upload-db-test-%"));
};

beforeEach(async () => {
  await cleanUp();
  await db.insert(users).values([
    { id: USER, name: "Uploader", email: `${USER}@example.com` },
    { id: OTHER_USER, name: "Other", email: `${OTHER_USER}@example.com` },
  ]);
  session.userId = USER;
});
afterAll(cleanUp);

describe("POST /api/courses/[courseId]/sources", () => {
  it("saves the PDF's text, page count, size and file name as a chapter", async () => {
    const courseId = await newCourse(USER);
    const file = makePdf(["Mitochondria make energy.", "Ribosomes make proteins."]);

    const response = await upload(courseId, file, "  Cells.pdf ");

    expect(response.status).toBe(201);
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, response.body.id!));
    expect(chapter).toMatchObject({
      courseId,
      name: "Cells.pdf",
      pageCount: 2,
      sizeBytes: file.size,
      textTruncated: false,
    });
    expect(chapter.text).toContain("Ribosomes make proteins.");
  });

  it("keeps only the first part of a very long PDF and marks it", async () => {
    const courseId = await newCourse(USER);
    // 50 lines of 60 characters: each line fits on the page, so all of it is extracted.
    const page = Array.from({ length: 50 }, () => "word ".repeat(12).trim()).join("\n");
    const pages = Array.from(
      { length: Math.ceil(MAX_DOCUMENT_CHARS / page.length) + 5 },
      () => page,
    );

    const response = await upload(courseId, makePdf(pages));

    expect(response.status).toBe(201);
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, response.body.id!));
    expect(chapter.textTruncated).toBe(true);
    expect(chapter.text.length).toBeLessThanOrEqual(MAX_DOCUMENT_CHARS);
  });

  it("refuses signed-out users, other users' courses and invalid ids", async () => {
    const othersCourse = await newCourse(OTHER_USER);
    const pdf = makePdf(["Text."]);

    expect((await upload(othersCourse, pdf)).status).toBe(404);
    expect((await upload("abc", pdf)).status).toBe(404);
    session.userId = null;
    expect((await upload(othersCourse, pdf)).status).toBe(401);
    expect(await db.select().from(chapters).where(eq(chapters.courseId, othersCourse))).toEqual([]);
  });

  it("explains files that aren't PDFs, have no text or can't be read", async () => {
    const courseId = await newCourse(USER);

    const notPdf = await upload(courseId, new Blob(["just text"]), "notes.txt");
    expect(notPdf).toEqual({ status: 400, body: { error: "Only PDF files are supported." } });
    expect((await upload(courseId, null)).status).toBe(400);
    const scanned = await upload(courseId, makePdf([""]));
    expect(scanned.status).toBe(422);
    expect(scanned.body.error).toContain("Scanned documents");
    expect((await upload(courseId, new Blob(["%PDF-1.4 broken"]))).status).toBe(422);
  });

  it(`stops at ${MAX_CHAPTERS_PER_COURSE} chapters per course, also for parallel uploads`, async () => {
    const courseId = await newCourse(USER);
    await addChapters(courseId, MAX_CHAPTERS_PER_COURSE - 1);

    const results = await Promise.all(
      Array.from({ length: 4 }, () => upload(courseId, makePdf(["Text."]))),
    );

    expect(results.map((r) => r.status).sort()).toEqual([201, 403, 403, 403]);
    expect(results.find((r) => r.status === 403)?.body.error).toContain(
      `up to ${MAX_CHAPTERS_PER_COURSE} chapters`,
    );
  });

  it(`stops a Free user at ${PLANS.free.maxChapters} chapters in all courses`, async () => {
    await addChapters(await newCourse(USER, "A"), 15);
    await addChapters(await newCourse(USER, "B"), PLANS.free.maxChapters - 15);

    const response = await upload(await newCourse(USER, "C"), makePdf(["Text."]));

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("Free plan");
  });

  it(`allows ${CHAPTER_UPLOAD_LIMIT.uploads} uploads per ${CHAPTER_UPLOAD_LIMIT.windowMinutes} minutes, failed ones included`, async () => {
    const courseId = await newCourse(USER);
    for (let i = 0; i < CHAPTER_UPLOAD_LIMIT.uploads; i++) {
      expect((await upload(courseId, new Blob(["not a pdf"]))).status).toBe(400);
    }

    const response = await upload(courseId, makePdf(["Text."]));

    expect(response.status).toBe(429);
    expect(response.body.error).toContain("try again in a few minutes");
    session.userId = OTHER_USER;
    expect((await upload(await newCourse(OTHER_USER), makePdf(["Text."]))).status).toBe(201);
  });
});
