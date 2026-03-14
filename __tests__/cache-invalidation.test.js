import { describe, it, expect } from "vitest";

// ─── Re-implement cache logic locally (same pattern as double-submit.test.js) ───
function createCache() {
  const _cache = new Map();

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

  function deleteCachedPrefix(prefix) {
    for (const key of _cache.keys()) {
      if (key.startsWith(prefix)) _cache.delete(key);
    }
  }

  return { cached, clearCached, deleteCachedPrefix, _cache };
}

describe("deleteCachedPrefix", () => {
  it("deletes matching keys and preserves non-matching", async () => {
    const { cached, deleteCachedPrefix, _cache } = createCache();

    await cached("pedidos:todos::", 10000, async () => [{ id: 1 }]);
    await cached("pedidos:pendientes:2026-03-14:", 10000, async () => [{ id: 2 }]);
    await cached("produccion:2026-03-14", 60000, async () => [{ id: 3 }]);

    expect(_cache.size).toBe(3);
    deleteCachedPrefix("pedidos:");

    expect(_cache.has("pedidos:todos::")).toBe(false);
    expect(_cache.has("pedidos:pendientes:2026-03-14:")).toBe(false);
    expect(_cache.has("produccion:2026-03-14")).toBe(true);
    expect(_cache.size).toBe(1);
  });

  it("is a no-op on empty cache", () => {
    const { deleteCachedPrefix, _cache } = createCache();
    deleteCachedPrefix("pedidos:");
    expect(_cache.size).toBe(0);
  });

  it("forces cold fetch after deletion (no SWR stale)", async () => {
    const { cached, deleteCachedPrefix } = createCache();
    let fetchCount = 0;

    // Populate cache
    await cached("pedidos:todos::", 10000, async () => { fetchCount++; return { v: 1 }; });
    expect(fetchCount).toBe(1);

    // Hard-delete
    deleteCachedPrefix("pedidos:");

    // Next call should do cold fetch (await fn), NOT return stale
    const r = await cached("pedidos:todos::", 10000, async () => { fetchCount++; return { v: 2 }; });
    expect(r).toEqual({ v: 2 }); // Fresh data, not stale
    expect(fetchCount).toBe(2);
  });

  it("differs from clearCached which returns stale data", async () => {
    const { cached, clearCached } = createCache();
    let fetchCount = 0;

    await cached("test", 10000, async () => { fetchCount++; return { v: 1 }; });
    clearCached("test"); // SWR-style: marks stale

    const r = await cached("test", 10000, async () => { fetchCount++; return { v: 2 }; });
    expect(r).toEqual({ v: 1 }); // clearCached returns stale data (SWR)
    expect(fetchCount).toBe(2); // Background fetch triggered
  });
});

describe("skipEnrich preserves optimistic entries", () => {
  // Simulate the skipEnrich logic from usePedidos.js
  function applySkipEnrich(prev, mapped) {
    const prevMap = {};
    for (const p of prev) { prevMap[p.id] = p; }
    const mappedIds = new Set(mapped.map(p => p.id));
    const merged = mapped.map(p => {
      const existing = prevMap[p.id];
      if (existing && (existing.productos || existing.importe)) {
        return { ...p, productos: existing.productos, importe: existing.importe };
      }
      return p;
    });
    for (const p of prev) {
      if (!mappedIds.has(p.id)) merged.unshift(p);
    }
    return merged;
  }

  it("preserves optimistic entry not present in API response", () => {
    const prev = [
      { id: "new-1", nombre: "Pedido Test", productos: "2x Brownie", importe: 7.0 },
      { id: "old-1", nombre: "Pedido Viejo", productos: "1x Cookie", importe: 3.5 },
    ];
    const mapped = [
      { id: "old-1", nombre: "Pedido Viejo", productos: "1x Cookie", importe: 3.5 },
    ];

    const result = applySkipEnrich(prev, mapped);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("new-1"); // Optimistic entry preserved at front
    expect(result[0].productos).toBe("2x Brownie");
    expect(result[1].id).toBe("old-1");
  });

  it("replaces optimistic entry when API response includes it", () => {
    const prev = [
      { id: "abc-123", nombre: "Pedido Test", productos: "2x Brownie", importe: 7.0, numPedido: 0 },
    ];
    const mapped = [
      { id: "abc-123", nombre: "Pedido Test", productos: "2x Brownie SG", importe: 7.0, numPedido: 42 },
    ];

    const result = applySkipEnrich(prev, mapped);

    expect(result).toHaveLength(1);
    expect(result[0].numPedido).toBe(42); // Server-enriched field wins
    expect(result[0].productos).toBe("2x Brownie"); // Preserved from prev (skipEnrich behavior)
  });

  it("does not duplicate entries present in both prev and mapped", () => {
    const prev = [
      { id: "1", productos: "A", importe: 1 },
      { id: "2", productos: "B", importe: 2 },
    ];
    const mapped = [
      { id: "1", productos: "A-fresh", importe: 1 },
      { id: "2", productos: "B-fresh", importe: 2 },
    ];

    const result = applySkipEnrich(prev, mapped);

    expect(result).toHaveLength(2);
    const ids = result.map(p => p.id);
    expect(ids).toEqual(["1", "2"]); // No duplicates
  });
});
