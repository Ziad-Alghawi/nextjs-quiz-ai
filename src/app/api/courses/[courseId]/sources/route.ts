import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { CHAPTER_UPLOAD_LIMIT, PLANS } from "@/lib/plans";
import { extractPdfText, limitDocumentText, uploadFileName } from "@/lib/pdf";
import { courseIdSchema } from "@/lib/validations/course";
import { pdfUploadSchema } from "@/lib/validations/quiz";
import { addChapter } from "@/server/services/chapters";
import { consumeRateLimit } from "@/server/services/rate-limit";
import { getCurrentUser } from "@/server/session";

const COURSE_NOT_FOUND = "This course doesn't exist anymore. Reload the page.";

/** Uploads a PDF into a course as a chapter. Only its text is kept, not the file. */
export async function POST(
  request: Request,
  context: RouteContext<"/api/courses/[courseId]/sources">,
) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Please sign in to upload a PDF.", 401);

  // Before anything else, so failed uploads count too: reading a PDF costs server time either way.
  const { uploads, windowMinutes } = CHAPTER_UPLOAD_LIMIT;
  if (!(await consumeRateLimit(`chapter-upload:${user.id}`, uploads, windowMinutes * 60 * 1000))) {
    return errorResponse(
      `You can upload up to ${uploads} PDFs every ${windowMinutes} minutes. Please try again in a few minutes.`,
      429,
    );
  }

  const courseId = courseIdSchema.safeParse((await context.params).courseId);
  if (!courseId.success) return errorResponse(COURSE_NOT_FOUND, 404);

  const body = await request.formData();
  const upload = await pdfUploadSchema.safeParseAsync(body.get("pdf"));
  if (!upload.success) return errorResponse(upload.error.issues[0].message, 400);

  let extracted: Awaited<ReturnType<typeof extractPdfText>>;
  try {
    extracted = await extractPdfText(upload.data);
  } catch {
    // pdf.js throws on damaged or password-protected files; the user can fix those.
    return errorResponse(
      "We couldn't read this PDF. It may be damaged or password-protected.",
      422,
    );
  }
  const { text, truncated } = limitDocumentText(extracted.text);
  if (!text) {
    return errorResponse(
      "We couldn't find any text in this PDF. Scanned documents aren't supported yet.",
      422,
    );
  }

  const result = await addChapter(user.id, courseId.data, {
    name: uploadFileName(body.get("pdf")),
    text,
    textTruncated: truncated,
    pageCount: extracted.pageCount,
    sizeBytes: upload.data.size,
  });
  if (!("error" in result)) return NextResponse.json({ id: result.id }, { status: 201 });

  switch (result.error) {
    case "course-not-found":
      return errorResponse(COURSE_NOT_FOUND, 404);
    case "course-full":
      return errorResponse(
        `A course can have up to ${result.limit} chapters. Delete one or start another course.`,
        403,
      );
    case "user-full":
      return errorResponse(
        result.plan === "free"
          ? `You've reached the ${result.limit} chapters of the Free plan. Delete chapters you no longer need, or upgrade to Pro for ${PLANS.pro.maxChapters}.`
          : `You've reached the limit of ${result.limit} chapters. Delete chapters you no longer need.`,
        403,
      );
  }
}
