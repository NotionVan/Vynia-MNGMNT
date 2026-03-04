import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notion, invalidateApiCache } from "../src/api.js";

describe("apiCall cache and deduplication", () => {
  beforeEach(() => invalidateApiCache());
  afterEach(() => vi.restoreAllMocks());

  it("deduplicates concurrent identical GET requests", async () => {
    let resolvePromise;
    const fetchMock = vi.fn().mockImplementation(() =>
      new Promise(res => { resolvePromise = () => res({ ok: true, json: () => Promise.resolve({ data: "test" }) }); })
    );
    vi.stubGlobal("fetch", fetchMock);

    const p1 = notion.loadPedidos();
    const p2 = notion.loadPedidos();
    resolvePromise();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(r2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("invalidateApiCache clears the cache forcing re-fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "fresh" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await notion.loadProduccion("2026-01-01");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Without invalidation, cache returns stored data
    await notion.loadProduccion("2026-01-01");
    expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1 (cached)

    // After invalidation, should re-fetch
    invalidateApiCache();
    await notion.loadProduccion("2026-01-01");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache POST/PATCH/DELETE requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await notion.findOrCreateCliente("Test", "612345678");
    await notion.findOrCreateCliente("Test", "612345678");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
