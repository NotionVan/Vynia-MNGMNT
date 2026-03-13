import { describe, it, expect, vi } from "vitest";

describe("Double-submit prevention", () => {
  it("useRef guard blocks concurrent calls to crearPedido", async () => {
    // Simulate the useRef guard pattern from TabNuevo.jsx
    const isSubmittingRef = { current: false };
    let callCount = 0;
    const mockApi = () => new Promise(r => setTimeout(() => { callCount++; r(); }, 50));

    const crearPedido = async () => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      try { await mockApi(); } finally { isSubmittingRef.current = false; }
    };

    // Simulate rapid double-click
    const p1 = crearPedido();
    const p2 = crearPedido(); // Should be blocked by ref guard
    const p3 = crearPedido(); // Should be blocked by ref guard
    await Promise.all([p1, p2, p3]);

    expect(callCount).toBe(1);
  });

  it("useRef guard resets after completion, allowing subsequent calls", async () => {
    const isSubmittingRef = { current: false };
    let callCount = 0;
    const mockApi = () => new Promise(r => setTimeout(() => { callCount++; r(); }, 10));

    const crearPedido = async () => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      try { await mockApi(); } finally { isSubmittingRef.current = false; }
    };

    await crearPedido();
    await crearPedido(); // Should work — first call completed
    expect(callCount).toBe(2);
  });
});

describe("POST request deduplication", () => {
  it("same path+body within 5s returns the same promise", async () => {
    const POST_DEDUP_WINDOW = 5000;
    const _postDedup = new Map();
    let fetchCount = 0;

    const mockFetch = (path, body) => {
      const postKey = `POST:${path}:${body}`;
      const existing = _postDedup.get(postKey);
      if (existing && Date.now() - existing.ts < POST_DEDUP_WINDOW) return existing.promise;
      fetchCount++;
      const promise = Promise.resolve({ id: `result-${fetchCount}` });
      _postDedup.set(postKey, { promise, ts: Date.now() });
      return promise;
    };

    const body = JSON.stringify({ name: "test" });
    const r1 = await mockFetch("/pedidos", body);
    const r2 = await mockFetch("/pedidos", body); // Same — should be deduped
    const r3 = await mockFetch("/pedidos", JSON.stringify({ name: "other" })); // Different body

    expect(fetchCount).toBe(2); // 1 for first + 1 for different body
    expect(r1).toBe(r2); // Same reference
    expect(r1).not.toBe(r3);
  });

  it("different paths are NOT deduped", async () => {
    const POST_DEDUP_WINDOW = 5000;
    const _postDedup = new Map();
    let fetchCount = 0;

    const mockFetch = (path, body) => {
      const postKey = `POST:${path}:${body}`;
      const existing = _postDedup.get(postKey);
      if (existing && Date.now() - existing.ts < POST_DEDUP_WINDOW) return existing.promise;
      fetchCount++;
      const promise = Promise.resolve({ id: fetchCount });
      _postDedup.set(postKey, { promise, ts: Date.now() });
      return promise;
    };

    const body = JSON.stringify({ name: "test" });
    await mockFetch("/pedidos", body);
    await mockFetch("/registros", body);
    expect(fetchCount).toBe(2);
  });
});

describe("Server-side stale-while-revalidate cache", () => {
  it("returns stale data immediately after clearCached", async () => {
    const _cache = new Map();
    let fetchCount = 0;

    async function cached(key, ttlMs, fn) {
      const entry = _cache.get(key);
      if (entry) {
        const age = Date.now() - entry.ts;
        if (age < ttlMs && !entry.stale) return entry.data;
        if (entry.stale || age < ttlMs * 2) {
          fn().then(data => _cache.set(key, { data, ts: Date.now() })).catch(() => {});
          return entry.data;
        }
      }
      const data = await fn();
      _cache.set(key, { data, ts: Date.now() });
      return data;
    }

    function clearCached(key) {
      const entry = _cache.get(key);
      if (entry) entry.stale = true;
    }

    // First call: populate cache
    const r1 = await cached("test", 10000, async () => { fetchCount++; return { v: 1 }; });
    expect(r1).toEqual({ v: 1 });
    expect(fetchCount).toBe(1);

    // Mark stale
    clearCached("test");

    // Second call: should return stale data immediately (v:1), trigger background revalidation
    const r2 = await cached("test", 10000, async () => { fetchCount++; return { v: 2 }; });
    expect(r2).toEqual({ v: 1 }); // Stale data returned immediately
    expect(fetchCount).toBe(2); // Background fetch triggered

    // Wait for background revalidation
    await new Promise(r => setTimeout(r, 50));

    // Third call: should return fresh data (v:2)
    const r3 = await cached("test", 10000, async () => { fetchCount++; return { v: 3 }; });
    expect(r3).toEqual({ v: 2 }); // Fresh from background revalidation
    expect(fetchCount).toBe(2); // No new fetch needed — still within TTL
  });

  it("fresh cache returns data without refetch", async () => {
    const _cache = new Map();
    let fetchCount = 0;

    async function cached(key, ttlMs, fn) {
      const entry = _cache.get(key);
      if (entry) {
        const age = Date.now() - entry.ts;
        if (age < ttlMs && !entry.stale) return entry.data;
        if (entry.stale || age < ttlMs * 2) {
          fn().then(data => _cache.set(key, { data, ts: Date.now() })).catch(() => {});
          return entry.data;
        }
      }
      const data = await fn();
      _cache.set(key, { data, ts: Date.now() });
      return data;
    }

    await cached("k", 60000, async () => { fetchCount++; return "a"; });
    const r = await cached("k", 60000, async () => { fetchCount++; return "b"; });
    expect(r).toBe("a");
    expect(fetchCount).toBe(1);
  });
});
