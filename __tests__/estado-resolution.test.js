import { describe, it, expect } from "vitest";
import { ESTADOS, ESTADO_NEXT, ESTADO_TRANSITIONS, effectiveEstado } from "../src/constants/estados.js";

describe("effectiveEstado", () => {
  it("returns estado when set", () => {
    expect(effectiveEstado({ estado: "En preparacion" })).toBe("En preparacion");
  });

  it("falls back to Recogido from checkbox", () => {
    expect(effectiveEstado({ recogido: true })).toBe("Recogido");
  });

  it("falls back to No acude from checkbox", () => {
    expect(effectiveEstado({ noAcude: true })).toBe("No acude");
  });

  it("falls back to Incidencia from checkbox", () => {
    expect(effectiveEstado({ incidencia: true })).toBe("Incidencia");
  });

  it("defaults to Sin empezar when nothing set", () => {
    expect(effectiveEstado({})).toBe("Sin empezar");
  });

  it("estado takes priority over checkboxes", () => {
    expect(effectiveEstado({ estado: "En preparacion", recogido: true })).toBe("En preparacion");
  });

  it("handles null/undefined estado", () => {
    expect(effectiveEstado({ estado: null })).toBe("Sin empezar");
    expect(effectiveEstado({ estado: undefined })).toBe("Sin empezar");
  });

  it("BUG-10 FIX: unknown estado passes through (source of truth)", () => {
    expect(effectiveEstado({ estado: "Nuevo estado desconocido" })).toBe("Nuevo estado desconocido");
    expect(effectiveEstado({ estado: "En preparación", recogido: true })).toBe("En preparación");
  });
});

describe("ESTADO_NEXT pipeline", () => {
  it("Sin empezar -> En preparación", () => {
    expect(ESTADO_NEXT["Sin empezar"]).toBe("En preparación");
  });

  it("En preparación -> Listo para recoger", () => {
    expect(ESTADO_NEXT["En preparación"]).toBe("Listo para recoger");
  });

  it("Listo para recoger -> Recogido", () => {
    expect(ESTADO_NEXT["Listo para recoger"]).toBe("Recogido");
  });

  it("terminal states have no next", () => {
    expect(ESTADO_NEXT["Recogido"]).toBeUndefined();
    expect(ESTADO_NEXT["No acude"]).toBeUndefined();
    expect(ESTADO_NEXT["Incidencia"]).toBeUndefined();
  });
});

describe("ESTADO_TRANSITIONS", () => {
  it("every estado has transitions defined", () => {
    for (const estado of Object.keys(ESTADOS)) {
      expect(ESTADO_TRANSITIONS[estado]).toBeDefined();
      expect(ESTADO_TRANSITIONS[estado].length).toBeGreaterThan(0);
    }
  });

  it("all transition targets are valid estados", () => {
    for (const [, targets] of Object.entries(ESTADO_TRANSITIONS)) {
      for (const t of targets) {
        expect(ESTADOS[t]).toBeDefined();
      }
    }
  });
});
