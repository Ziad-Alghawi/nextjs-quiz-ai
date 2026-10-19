import { AIMessage } from "@langchain/core/messages";
import { vi } from "vitest";
import type { GeneratedQuiz } from "@/lib/validations/quiz";

/*
 * Stands in for @langchain/google/node so tests never call the real Gemini API:
 *   vi.mock("@langchain/google/node", () => import("@/test/gemini-mock"));
 * Every ChatGoogle hands out the same structured-output `model`; tests set what `model.invoke`
 * resolves to, and `model.names` records which Gemini model each call was made with.
 */
export const model = { invoke: vi.fn(), names: [] as string[] };

export class ChatGoogle {
  constructor({ model: name }: { model: string }) {
    model.names.push(name);
  }
  withStructuredOutput() {
    return model;
  }
}

export function resetModel() {
  model.invoke.mockReset();
  model.names = [];
}

/**
 * What the mocked structured-output model resolves to: the raw message with its token counts, and
 * the parsed quiz (null when the output didn't match the schema).
 */
export function modelResponse(
  parsed: GeneratedQuiz | null,
  usage = { input_tokens: 1000, output_tokens: 300 },
) {
  return {
    raw: new AIMessage({
      content: "",
      usage_metadata: { ...usage, total_tokens: usage.input_tokens + usage.output_tokens },
    }),
    parsed,
  };
}
