import { AIMessage } from "@langchain/core/messages";
import type { GeneratedQuiz } from "@/lib/validations/quiz";

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
