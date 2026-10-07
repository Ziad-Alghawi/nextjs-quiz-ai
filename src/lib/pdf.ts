import { extractText } from "unpdf";

export async function extractPdfText(file: Blob): Promise<string> {
  const { text } = await extractText(new Uint8Array(await file.arrayBuffer()), {
    mergePages: true,
  });
  return text.trim();
}
