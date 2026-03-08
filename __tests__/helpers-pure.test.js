import { describe, it, expect } from "vitest";
import { waLink, parseProductsStr, esTarde } from "../src/utils/helpers.js";

// ─── waLink ───

describe("waLink", () => {
  it("adds country code 34 to Spanish mobile number", () => {
    expect(waLink("612345678")).toBe("https://wa.me/34612345678");
  });

  it("strips formatting characters (spaces, dashes, dots, parens)", () => {
    expect(waLink("612-345-678")).toBe("https://wa.me/34612345678");
    expect(waLink("612 345 678")).toBe("https://wa.me/34612345678");
    expect(waLink("(612) 345.678")).toBe("https://wa.me/34612345678");
  });

  it("handles + prefix and strips it", () => {
    expect(waLink("+34612345678")).toBe("https://wa.me/34612345678");
    expect(waLink("+34 612 345 678")).toBe("https://wa.me/34612345678");
  });

  it("does not duplicate country code when already present", () => {
    expect(waLink("34612345678")).toBe("https://wa.me/34612345678");
  });

  it("handles null/undefined/empty gracefully", () => {
    expect(waLink(null)).toBe("https://wa.me/34");
    expect(waLink(undefined)).toBe("https://wa.me/34");
    expect(waLink("")).toBe("https://wa.me/34");
  });
});

// ─── parseProductsStr ───

describe("parseProductsStr", () => {
  it("parses standard format '2x Brownie, 1x Cookie'", () => {
    const result = parseProductsStr("2x Brownie, 1x Cookie");
    expect(result).toEqual([
      { nombre: "Brownie", unidades: 2 },
      { nombre: "Cookie", unidades: 1 },
    ]);
  });

  it("handles double-digit quantities", () => {
    const result = parseProductsStr("10x Tarta de queso");
    expect(result).toEqual([{ nombre: "Tarta de queso", unidades: 10 }]);
  });

  it("handles Spanish characters (ñ, ó, á)", () => {
    const result = parseProductsStr("3x Bizcocho de piñón");
    expect(result).toEqual([{ nombre: "Bizcocho de piñón", unidades: 3 }]);
  });

  it("returns empty array for null/undefined/empty", () => {
    expect(parseProductsStr(null)).toEqual([]);
    expect(parseProductsStr(undefined)).toEqual([]);
    expect(parseProductsStr("")).toEqual([]);
  });

  it("filters out malformed entries without 'Nx ' format", () => {
    const result = parseProductsStr("2x Brownie, invalid entry, 1x Cookie");
    expect(result).toEqual([
      { nombre: "Brownie", unidades: 2 },
      { nombre: "Cookie", unidades: 1 },
    ]);
  });
});

// ─── esTarde ───

describe("esTarde", () => {
  it("returns true when notas contains 'tarde'", () => {
    expect(esTarde({ notas: "recoger por la tarde" })).toBe(true);
  });

  it("returns true when notas contains hour >= 17", () => {
    expect(esTarde({ notas: "a las 18h" })).toBe(true);
  });

  it("returns true when hora field is >= 17:00", () => {
    expect(esTarde({ hora: "17:30" })).toBe(true);
    expect(esTarde({ hora: "19:00" })).toBe(true);
  });

  it("returns false for morning deliveries", () => {
    expect(esTarde({ hora: "09:00" })).toBe(false);
    expect(esTarde({ fecha: "2026-03-08T10:30:00" })).toBe(false);
  });

  it("returns false when no notas/hora/fecha", () => {
    expect(esTarde({})).toBe(false);
    expect(esTarde({ notas: "" })).toBe(false);
  });
});
