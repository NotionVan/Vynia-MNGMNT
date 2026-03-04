import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notion, invalidateApiCache } from "../src/api.js";

describe("apiCall basic behavior", () => {
  beforeEach(() => invalidateApiCache());
  afterEach(() => vi.restoreAllMocks());

  it("makes GET request and returns JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: "1", titulo: "Pedido Test" }]),
    }));
    const result = await notion.loadAllPedidos();
    expect(result).toEqual([{ id: "1", titulo: "Pedido Test" }]);
  });

  it("throws on non-ok response with error message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Database error" }),
    }));
    await expect(notion.loadAllPedidos()).rejects.toThrow("Database error");
  });

  it("throws generic error when response has no error field", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({}),
    }));
    await expect(notion.loadPedidos()).rejects.toThrow("API Error 502");
  });

  it("handles json parse failure on error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("invalid json")),
    }));
    await expect(notion.loadProduccion("2026-03-04")).rejects.toThrow("Unknown error");
  });
});
