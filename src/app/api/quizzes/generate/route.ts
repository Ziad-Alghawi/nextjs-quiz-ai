import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { readPdfText, uploadFileName } from "@/lib/pdf";
import { GUEST_TRIAL, isQuestionCountAllowed, questionCountUpgradeMessage } from "@/lib/plans";
import { formatOrList } from "@/lib/utils";
import { pdfUploadSchema, quickQuizSchema } from "@/lib/validations/quiz";
import { generateAndSaveQuiz } from "@/server/services/generation";
import { getPlan } from "@/server/services/usage";
import { getCurrentUser } from "@/server/session";

// The primary model and, when needed, the fallback must both fit (timings in generation.ts).
// Set explicitly so a lower platform default can't cut a generation off.
export const maxDuration = 60;

/** Generates a quiz from one uploaded PDF and saves it in the user's "My quizzes" folder. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return errorResponse("Please sign in to generate a quiz.", 401);

  // A body that isn't form data gets the same 400 as a form without a file.
  const body = await request.formData().catch(() => new FormData());
  const upload = await pdfUploadSchema.safeParseAsync(body.get("pdf"));
  if (!upload.success) return errorResponse(upload.error.issues[0].message, 400);

  const quick = quickQuizSchema.safeParse({ questionCount: body.get("questionCount") });
  if (!quick.success) return errorResponse(quick.error.issues[0].message, 400);
  const { questionCount } = quick.data;

  if (user.isGuest) {
    if (!GUEST_TRIAL.questionCounts.some((count) => count === questionCount)) {
      return errorResponse(
        `The trial makes quizzes with ${formatOrList(GUEST_TRIAL.questionCounts)} questions. Create an account for more.`,
        403,
      );
    }
  } else if (!isQuestionCountAllowed(await getPlan(user.id), questionCount)) {
    return errorResponse(questionCountUpgradeMessage(questionCount), 403);
  }

  // Guests get only the first part of long documents, which bounds what a trial quiz costs.
  const pdf = await readPdfText(
    upload.data,
    user.isGuest ? GUEST_TRIAL.maxDocumentChars : undefined,
  );
  if ("error" in pdf) return errorResponse(pdf.error, 422);

  // Reserved only after the cheap checks above, right before the call that costs money.
  const result = await generateAndSaveQuiz(user.id, {
    documents: [{ title: uploadFileName(body.get("pdf")), text: pdf.text }],
    questionCount,
  });
  if ("error" in result) return errorResponse(result.error, result.status);
  return NextResponse.json({ quizId: result.quizId, truncated: pdf.truncated }, { status: 201 });
}
