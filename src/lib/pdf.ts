import { extractText } from "unpdf";
import { MAX_DOCUMENT_CHARS } from "@/lib/plans";

export async function extractPdfText(file: Blob): Promise<string> {
  const { text } = await extractText(new Uint8Array(await file.arrayBuffer()), {
    mergePages: true,
  });
  return text.trim();
}

/** Keeps the first MAX_DOCUMENT_CHARS characters, cut at a word boundary when there is one. */
export function limitDocumentText(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_DOCUMENT_CHARS) return { text, truncated: false };
  const head = text.slice(0, MAX_DOCUMENT_CHARS);
  const lastSpace = head.search(/\s\S*$/);
  return { text: lastSpace > 0 ? head.slice(0, lastSpace) : head, truncated: true };
}
