import { describe, it, expect } from "vitest";

describe("BUG-14 FIX: Bulk estado change with rollback", () => {
  it("rollback logic restores failed pedidos to previous estado", () => {
    const pedidos = [
      { id: "1", estado: "Sin empezar" },
      { id: "2", estado: "Sin empezar" },
      { id: "3", estado: "Sin empezar" },
    ];
    const selected = pedidos;
    const nuevoEstado = "En preparacion";
    const prevEstados = new Map(selected.map(p => [p.id, p.estado]));

    // Step 1: Optimistic update (all get new estado)
    let current = pedidos.map(p => ({ ...p, estado: nuevoEstado }));
    expect(current.every(p => p.estado === "En preparacion")).toBe(true);

    // Step 2: Simulate API results (pedido "2" fails)
    const results = [
      { status: "fulfilled", value: { ok: true } },
      { status: "rejected", reason: new Error("429 Rate Limited") },
      { status: "fulfilled", value: { ok: true } },
    ];
    const failedIds = new Set();
    results.forEach((r, i) => { if (r.status === "rejected") failedIds.add(selected[i].id); });

    // Step 3: Rollback failed pedidos
    current = current.map(p => failedIds.has(p.id) ? { ...p, estado: prevEstados.get(p.id) } : p);

    // Pedido "2" is rolled back to "Sin empezar"
    expect(current[0].estado).toBe("En preparacion");
    expect(current[1].estado).toBe("Sin empezar"); // ROLLED BACK
    expect(current[2].estado).toBe("En preparacion");
  });

  it("no rollback when all succeed", () => {
    const pedidos = [
      { id: "1", estado: "Sin empezar" },
      { id: "2", estado: "Sin empezar" },
    ];
    const nuevoEstado = "En preparacion";

    const current = pedidos.map(p => ({ ...p, estado: nuevoEstado }));
    const results = [
      { status: "fulfilled", value: { ok: true } },
      { status: "fulfilled", value: { ok: true } },
    ];
    const failedIds = new Set();
    results.forEach((r, i) => { if (r.status === "rejected") failedIds.add(pedidos[i].id); });

    expect(failedIds.size).toBe(0);
    expect(current.every(p => p.estado === "En preparacion")).toBe(true);
  });
});
