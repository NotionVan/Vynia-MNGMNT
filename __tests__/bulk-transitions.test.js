import { describe, it, expect } from "vitest";
import { computeBulkTransitions } from "../src/utils/stats.js";

describe("computeBulkTransitions", () => {
  it("returns empty array for empty selection", () => {
    const pedidos = [{ id: "1", estado: "Sin empezar" }];
    expect(computeBulkTransitions(pedidos, new Set())).toEqual([]);
  });

  it("returns intersection of valid transitions for mixed estados", () => {
    const pedidos = [
      { id: "1", estado: "Sin empezar" },
      { id: "2", estado: "En preparación" },
      { id: "3", estado: "Listo para recoger" },
    ];
    const selected = new Set(["1", "2", "3"]);
    const transitions = computeBulkTransitions(pedidos, selected);

    // All 3 estados can transition to Recogido, No acude, and Incidencia
    expect(transitions).toContain("Recogido");
    expect(transitions).toContain("No acude");
    expect(transitions).toContain("Incidencia");

    // "Sin empezar" can't go to "Sin empezar", so it should NOT be in the intersection
    expect(transitions).not.toContain("Sin empezar");
    // "Listo para recoger" can't go to "Listo para recoger"
    expect(transitions).not.toContain("Listo para recoger");
  });
});
