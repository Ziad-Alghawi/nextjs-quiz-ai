import { describe, expect, it } from "vitest";
import { readGenerationResponse } from "./generation-response";

const json = (body: unknown, status: number) => Response.json(body, { status });

describe("readGenerationResponse", () => {
  it("links to the new quiz", async () => {
    expect(await readGenerationResponse(json({ quizId: 7, truncated: false }, 201))).toEqual({
      href: "/quizzes/7",
    });
  });

  it("adds the notice when the document was cut", async () => {
    expect(await readGenerationResponse(json({ quizId: 7, truncated: true }, 201))).toEqual({
      href: "/quizzes/7?notice=truncated",
    });
  });

  it("shows the message of the server", async () => {
    expect(await readGenerationResponse(json({ error: "Daily limit reached." }, 429))).toEqual({
      error: "Daily limit reached.",
    });
  });

  it.each([
    [413, "too large"],
    [504, "took too long"],
    [500, "Something went wrong"],
  ])("explains a %i that is not JSON", async (status, text) => {
    const result = await readGenerationResponse(new Response("<html>", { status }));
    expect(result).toEqual({ error: expect.stringContaining(text) });
  });

  it("does not trust a success status with an unexpected body", async () => {
    expect(await readGenerationResponse(json({ ok: true }, 201))).toEqual({
      error: expect.stringContaining("Something went wrong"),
    });
  });
});
