import { describe, expect, it } from "vitest";
import { MAX_DOCUMENT_CHARS } from "./plans";
import { makePdf } from "@/test/make-pdf";
import { extractPdfText, limitDocumentText, shareDocumentBudget } from "./pdf";

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

describe("shareDocumentBudget", () => {
  it("keeps documents that fit together unchanged", () => {
    const documents = [
      { title: "a", text: "a".repeat(MAX_DOCUMENT_CHARS / 2) },
      { title: "b", text: "b".repeat(MAX_DOCUMENT_CHARS / 2) },
    ];
    expect(shareDocumentBudget(documents)).toEqual({ documents, truncated: false });
  });

  it("gives what a short document doesn't use to the longer ones, keeping the order", () => {
    const result = shareDocumentBudget([
      { title: "short", text: "a".repeat(10_000) },
      { title: "longest", text: "b".repeat(MAX_DOCUMENT_CHARS) },
      { title: "long", text: "c".repeat(100_000) },
    ]);

    // Equal shares are 50,000 each; the short one leaves 40,000 for the two long ones.
    expect(result.documents.map(({ title, text }) => [title, text.length])).toEqual([
      ["short", 10_000],
      ["longest", 70_000],
      ["long", 70_000],
    ]);
    expect(result.truncated).toBe(true);
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
