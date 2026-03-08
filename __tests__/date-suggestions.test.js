import { describe, it, expect } from "vitest";
import { computeDateSuggestions } from "../src/utils/helpers.js";

describe("computeDateSuggestions", () => {
  it("returns empty array for null/undefined inputs", () => {
    expect(computeDateSuggestions(null, [])).toEqual([]);
    expect(computeDateSuggestions({}, null)).toEqual([]);
    expect(computeDateSuggestions(undefined, undefined)).toEqual([]);
  });

  it("returns empty array when lineas is empty", () => {
    const rango = {
      "2026-03-07": [{ nombre: "Brownie", totalUnidades: 5 }],
    };
    expect(computeDateSuggestions(rango, [])).toEqual([]);
  });

  it("returns empty array when no overlap exists", () => {
    const rango = {
      "2026-03-07": [{ nombre: "Brownie", totalUnidades: 5 }],
      "2026-03-08": [{ nombre: "Cookie Oreo", totalUnidades: 3 }],
    };
    const lineas = [{ nombre: "Tarta de queso", cantidad: 1 }];
    expect(computeDateSuggestions(rango, lineas)).toEqual([]);
  });

  it("returns correct suggestion for single product overlap", () => {
    const rango = {
      "2026-03-07": [{ nombre: "Brownie", totalUnidades: 5 }],
      "2026-03-08": [{ nombre: "Cookie Oreo", totalUnidades: 3 }],
    };
    const lineas = [{ nombre: "Brownie", cantidad: 2 }];
    const result = computeDateSuggestions(rango, lineas);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-03-07");
    expect(result[0].overlapCount).toBe(1);
    expect(result[0].overlapUnits).toBe(5);
    expect(result[0].score).toBe(1 * 3 + 5); // 8
  });

  it("ranks multi-product overlap higher than single", () => {
    const rango = {
      "2026-03-07": [
        { nombre: "Brownie", totalUnidades: 2 },
        { nombre: "Cookie Oreo", totalUnidades: 3 },
      ],
      "2026-03-08": [
        { nombre: "Brownie", totalUnidades: 10 },
      ],
    };
    const lineas = [
      { nombre: "Brownie", cantidad: 1 },
      { nombre: "Cookie Oreo", cantidad: 1 },
    ];
    const result = computeDateSuggestions(rango, lineas);
    expect(result).toHaveLength(2);
    // Mar 7: overlapCount=2, overlapUnits=5 → score = 6+5 = 11
    // Mar 8: overlapCount=1, overlapUnits=10 → score = 3+10 = 13
    // Mar 8 wins by score
    expect(result[0].date).toBe("2026-03-08");
    expect(result[0].score).toBe(13);
    expect(result[1].date).toBe("2026-03-07");
    expect(result[1].score).toBe(11);
  });

  it("breaks ties by earlier date", () => {
    const rango = {
      "2026-03-10": [{ nombre: "Brownie", totalUnidades: 5 }],
      "2026-03-08": [{ nombre: "Brownie", totalUnidades: 5 }],
    };
    const lineas = [{ nombre: "Brownie", cantidad: 1 }];
    const result = computeDateSuggestions(rango, lineas);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-03-08"); // earlier date wins tie
    expect(result[1].date).toBe("2026-03-10");
  });

  it("matches product names case-insensitively", () => {
    const rango = {
      "2026-03-07": [{ nombre: "Brownie", totalUnidades: 5 }],
    };
    const lineas = [{ nombre: "brownie", cantidad: 2 }];
    const result = computeDateSuggestions(rango, lineas);
    expect(result).toHaveLength(1);
    expect(result[0].overlapCount).toBe(1);
  });

  it("trims whitespace in product names", () => {
    const rango = {
      "2026-03-07": [{ nombre: "  Brownie  ", totalUnidades: 3 }],
    };
    const lineas = [{ nombre: "Brownie ", cantidad: 1 }];
    const result = computeDateSuggestions(rango, lineas);
    expect(result).toHaveLength(1);
  });

  it("includes overlapping product details in result", () => {
    const rango = {
      "2026-03-07": [
        { nombre: "Brownie", totalUnidades: 5 },
        { nombre: "Vinacaos", totalUnidades: 20 },
        { nombre: "Cookie Oreo", totalUnidades: 3 },
      ],
    };
    const lineas = [
      { nombre: "Brownie", cantidad: 1 },
      { nombre: "Vinacaos", cantidad: 2 },
    ];
    const result = computeDateSuggestions(rango, lineas);
    expect(result[0].overlapping).toHaveLength(2);
    expect(result[0].overlapping.map(p => p.nombre).sort()).toEqual(["Brownie", "Vinacaos"]);
  });

  it("handles empty produccion range", () => {
    const lineas = [{ nombre: "Brownie", cantidad: 1 }];
    expect(computeDateSuggestions({}, lineas)).toEqual([]);
  });

  it("handles days with empty product arrays", () => {
    const rango = {
      "2026-03-07": [],
      "2026-03-08": [{ nombre: "Brownie", totalUnidades: 5 }],
    };
    const lineas = [{ nombre: "Brownie", cantidad: 1 }];
    const result = computeDateSuggestions(rango, lineas);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-03-08");
  });

  // ─── Horario integration ───

  it("with null horario behaves identically (backward compat)", () => {
    const rango = {
      "2026-03-07": [{ nombre: "Brownie", totalUnidades: 5 }],
    };
    const lineas = [{ nombre: "Brownie", cantidad: 1 }];
    const withNull = computeDateSuggestions(rango, lineas, null);
    const withUndefined = computeDateSuggestions(rango, lineas, undefined);
    const withoutParam = computeDateSuggestions(rango, lineas);
    expect(withNull).toEqual(withoutParam);
    expect(withUndefined).toEqual(withoutParam);
  });

  it("excludes closed day even if it has high score", () => {
    const rango = {
      // 2026-03-08 is Sunday → bdIndex 6
      "2026-03-08": [{ nombre: "Brownie", totalUnidades: 20 }],
      // 2026-03-09 is Monday → bdIndex 0
      "2026-03-09": [{ nombre: "Brownie", totalUnidades: 2 }],
    };
    const lineas = [{ nombre: "Brownie", cantidad: 1 }];
    const horario = {
      0: { abierto: true },  // Lunes open
      6: { abierto: false }, // Domingo closed
    };
    const result = computeDateSuggestions(rango, lineas, horario);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-03-09");
  });

  it("returns empty when all days with overlap are closed", () => {
    const rango = {
      "2026-03-08": [{ nombre: "Brownie", totalUnidades: 5 }], // Sunday
      "2026-03-07": [{ nombre: "Brownie", totalUnidades: 3 }], // Saturday
    };
    const lineas = [{ nombre: "Brownie", cantidad: 1 }];
    const horario = {
      5: { abierto: false }, // Sabado
      6: { abierto: false }, // Domingo
    };
    const result = computeDateSuggestions(rango, lineas, horario);
    expect(result).toEqual([]);
  });

  it("with all-open horario gives same result as no horario", () => {
    const rango = {
      "2026-03-07": [{ nombre: "Brownie", totalUnidades: 5 }],
      "2026-03-08": [{ nombre: "Cookie", totalUnidades: 3 }],
    };
    const lineas = [{ nombre: "Brownie", cantidad: 1 }];
    const allOpen = {};
    for (let i = 0; i < 7; i++) allOpen[i] = { abierto: true };
    const withHorario = computeDateSuggestions(rango, lineas, allOpen);
    const without = computeDateSuggestions(rango, lineas);
    expect(withHorario).toEqual(without);
  });
});
