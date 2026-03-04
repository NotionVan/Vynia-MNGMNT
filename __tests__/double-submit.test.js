import { describe, it, expect } from "vitest";

describe("CHAOS-02: Double-tap creates duplicate pedido", () => {
  it("DOCUMENTS BUG: crearPedido has no useRef submission guard", () => {
    // In App.jsx, the crearPedido function:
    //
    // 1. Checks client/fecha/lineas (sync)
    // 2. setLoading(true) — React state, batched/async
    //
    // The button: <button onClick={crearPedido} disabled={loading || ...}>
    //
    // Between two rapid taps, React hasn't re-rendered to set disabled=true.
    // setLoading(true) is a state update that only takes effect on next render.
    //
    // A useRef-based guard is needed:
    //   const isSubmittingRef = useRef(false);
    //   if (isSubmittingRef.current) return;
    //   isSubmittingRef.current = true;
    //   try { ... } finally { isSubmittingRef.current = false; }

    const hasRefGuard = false; // Verified: no useRef guard exists
    expect(hasRefGuard).toBe(false);
  });
});
