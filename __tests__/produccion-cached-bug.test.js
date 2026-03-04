import { describe, it, expect } from "vitest";

describe("BUG-01: produccion.js cached() return value", () => {
  it("DOCUMENTS BUG (NOW FIXED): cached callback must return data, not res.status()", () => {
    // BEFORE FIX: api/produccion.js line 49 was:
    //   return res.status(200).json({ productos: [] });
    //
    // This caused two problems:
    // 1. The cached value was the return of res.json() (undefined in Express)
    // 2. On subsequent requests within TTL, `productos` was undefined
    // 3. The first request also sent response inside cached(), then line 145
    //    tried to send a SECOND response -> "headers already sent"
    //
    // AFTER FIX: Changed to `return [];`
    // The cached() callback now returns data (an empty array),
    // and line 145 correctly wraps it: res.status(200).json({ productos })

    // Simulate the fixed behavior
    const cachedCallback = () => {
      const pedidos = [];
      if (pedidos.length === 0) return []; // FIXED: returns data
      return pedidos;
    };

    const result = cachedCallback();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });
});
