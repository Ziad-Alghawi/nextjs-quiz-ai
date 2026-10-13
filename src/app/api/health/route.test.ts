import { describe, expect, it, vi } from "vitest";
import { pingDatabase } from "@/db/health";
import { GET } from "./route";

vi.mock("@/db/health", () => ({ pingDatabase: vi.fn() }));

describe("GET /api/health", () => {
  it("returns 200 when the database answers", async () => {
    vi.mocked(pingDatabase).mockResolvedValue(true);
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "up" });
  });

  it("returns 503 when the database is unreachable", async () => {
    vi.mocked(pingDatabase).mockResolvedValue(false);
    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "error", database: "down" });
  });
});
