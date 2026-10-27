import { extractText } from "unpdf";
import { MAX_DOCUMENT_CHARS } from "@/lib/plans";

type PdfText = { text: string; truncated: boolean; pageCount: number } | { error: string };

/** The PDF's text, cut to `maxChars`, or what to tell the user when it has none to use. */
export async function readPdfText(file: Blob, maxChars = MAX_DOCUMENT_CHARS): Promise<PdfText> {
  let pdf: { text: string; totalPages: number };
  try {
    pdf = await extractText(new Uint8Array(await file.arrayBuffer()), { mergePages: true });
  } catch {
    // pdf.js throws on damaged or password-protected files; the user can fix those.
    return { error: "We couldn't read this PDF. It may be damaged or password-protected." };
  }
  const { text, truncated } = limitDocumentText(pdf.text.trim(), maxChars);
  if (!text) {
    return {
      error: "We couldn't find any text in this PDF. Scanned documents aren't supported yet.",
    };
  }
  return { text, truncated, pageCount: pdf.totalPages };
}

/** The uploaded file name for display and the prompt, or a fallback when the browser sends none. */
export const uploadFileName = (upload: FormDataEntryValue | null) =>
  (upload instanceof File ? upload.name.trim() : "").slice(0, 200) || "Untitled.pdf";

/** Keeps the first maxChars characters, cut at a word boundary when there is one. */
export function limitDocumentText(
  text: string,
  maxChars = MAX_DOCUMENT_CHARS,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  const head = text.slice(0, maxChars);
  const lastSpace = head.search(/\s\S*$/);
  return { text: lastSpace > 0 ? head.slice(0, lastSpace) : head, truncated: true };
}

/**
 * Fits several documents into MAX_DOCUMENT_CHARS together, in their order. Each gets an equal share,
 * and what a shorter document doesn't use goes to the longer ones, so one long document can't crowd
 * out the others.
 */
export function shareDocumentBudget<T extends { text: string }>(documents: T[]) {
  const texts: string[] = [];
  let budget = MAX_DOCUMENT_CHARS;
  let remaining = documents.length;
  // Shortest first, so every leftover share is still there for the longer documents after it.
  const shortestFirst = documents
    .map((_, index) => index)
    .sort((a, b) => documents[a].text.length - documents[b].text.length);
  for (const index of shortestFirst) {
    const { text } = limitDocumentText(documents[index].text, Math.floor(budget / remaining));
    texts[index] = text;
    budget -= text.length;
    remaining -= 1;
  }
  return {
    documents: documents.map((document, index) => ({ ...document, text: texts[index] })),
    truncated: documents.some((document, index) => texts[index].length < document.text.length),
  };
}
