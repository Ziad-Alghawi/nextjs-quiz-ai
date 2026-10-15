import { extractText } from "unpdf";
import { MAX_DOCUMENT_CHARS } from "@/lib/plans";

export async function extractPdfText(file: Blob) {
  const { text, totalPages } = await extractText(new Uint8Array(await file.arrayBuffer()), {
    mergePages: true,
  });
  return { text: text.trim(), pageCount: totalPages };
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
