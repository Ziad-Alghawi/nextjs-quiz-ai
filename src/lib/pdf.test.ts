import { describe, expect, it } from "vitest";
import { MAX_DOCUMENT_CHARS } from "./plans";
import { makePdf } from "@/test/make-pdf";
import { extractPdfText, limitDocumentText } from "./pdf";

describe("limitDocumentText", () => {
  it("keeps a document within the limit unchanged", () => {
    const text = "a".repeat(MAX_DOCUMENT_CHARS);
    expect(limitDocumentText(text)).toEqual({ text, truncated: false });
  });

  it("keeps the first part of a longer document, cut at a word boundary", () => {
    const text = "word ".repeat(MAX_DOCUMENT_CHARS);
    const result = limitDocumentText(text);

    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(MAX_DOCUMENT_CHARS);
    expect(result.text.length).toBeGreaterThan(MAX_DOCUMENT_CHARS - 10);
    expect(result.text.endsWith("word")).toBe(true);
    expect(text.startsWith(result.text)).toBe(true);
  });

  it("cuts at the limit when there is no space to cut at", () => {
    const result = limitDocumentText("x".repeat(MAX_DOCUMENT_CHARS + 1));
    expect(result).toEqual({ text: "x".repeat(MAX_DOCUMENT_CHARS), truncated: true });
  });
});

describe("extractPdfText", () => {
  it("returns the text of every page and the page count", async () => {
    const { text, pageCount } = await extractPdfText(makePdf(["Cells divide.", "Genes mutate."]));

    expect(pageCount).toBe(2);
    expect(text).toContain("Cells divide.");
    expect(text).toContain("Genes mutate.");
  });
});
