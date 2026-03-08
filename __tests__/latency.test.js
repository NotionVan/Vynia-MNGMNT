import { describe, it, expect, vi, afterEach } from "vitest";

// ─── withTiming ───

describe("withTiming", () => {
  it("measures elapsed time correctly", async () => {
    const { withTiming } = await import("../api/_notion.js");

    const { data, ms } = await withTiming("test", async () => {
      await new Promise(r => setTimeout(r, 50));
      return "ok";
    });

    expect(data).toBe("ok");
    expect(ms).toBeGreaterThanOrEqual(40);
    expect(ms).toBeLessThan(500);
  });

  it("propagates errors from fn", async () => {
    const { withTiming } = await import("../api/_notion.js");

    await expect(
      withTiming("fail", async () => { throw new Error("boom"); })
    ).rejects.toThrow("boom");
  });

  it("returns ~0ms for instant functions", async () => {
    const { withTiming } = await import("../api/_notion.js");

    const { data, ms } = await withTiming("fast", async () => "cached");
    expect(data).toBe("cached");
    expect(ms).toBeLessThan(5);
  });
});

// ─── doFetch timeout (AbortController) ───

describe("doFetch timeout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("passes AbortSignal to fetch", async () => {
    const fetchMock = vi.fn().mockImplementation((url, opts) => {
      return new Promise((resolve, reject) => {
        if (opts?.signal) {
          opts.signal.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { notion, invalidateApiCache } = await import("../src/api.js");
    invalidateApiCache();

    // Start the request (will hang, but we just check the signal)
    const promise = notion.loadPedidos();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, callOpts] = fetchMock.mock.calls[0];
    expect(callOpts.signal).toBeInstanceOf(AbortSignal);

    // Cleanup: let the abort fire to avoid unhandled rejection
    // The 10s timer will eventually abort, but we don't wait for it
  });

  it("succeeds when response arrives within timeout", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: "1" }]),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { notion, invalidateApiCache } = await import("../src/api.js");
    invalidateApiCache();

    const result = await notion.loadPedidos();
    expect(result).toEqual([{ id: "1" }]);
  });

  it("converts AbortError to user-friendly message", async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const { notion, invalidateApiCache } = await import("../src/api.js");
    invalidateApiCache();

    await expect(notion.loadPedidos()).rejects.toThrow(/Tiempo de espera agotado/);
  });
});

// ─── health endpoint ───

describe("health endpoint", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns ok:true with latency measurement", async () => {
    vi.doMock("../api/_notion.js", () => ({
      notion: {
        databases: {
          query: vi.fn().mockImplementation(async () => {
            await new Promise(r => setTimeout(r, 50));
            return { results: [] };
          }),
        },
      },
      cached: vi.fn((key, ttl, fn) => fn()),
    }));

    const { default: handler } = await import("../api/health.js");

    const req = { method: "GET" };
    const body = {};
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(d => Object.assign(body, d)),
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(body.ok).toBe(true);
    expect(body.latency).toBeGreaterThanOrEqual(40);
    expect(body.latency).toBeLessThan(500);
    expect(body.ts).toBeDefined();
  });

  it("returns 503 when Notion is unreachable", async () => {
    vi.doMock("../api/_notion.js", () => ({
      notion: {
        databases: {
          query: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
        },
      },
      cached: vi.fn((key, ttl, fn) => fn()),
    }));

    const { default: handler } = await import("../api/health.js");

    const req = { method: "GET" };
    const body = {};
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(d => Object.assign(body, d)),
    };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("ECONNREFUSED");
  });
});
