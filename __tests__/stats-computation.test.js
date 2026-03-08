import { describe, it, expect } from "vitest";
import { computePedidoStats } from "../src/utils/stats.js";

describe("computePedidoStats", () => {
  it("returns zero stats for empty array", () => {
    const stats = computePedidoStats([]);
    expect(stats).toEqual({
      statsTotal: 0,
      statsPendientes: 0,
      statsRecogidos: 0,
      statsPorPreparar: 0,
      statsListoRecoger: 0,
    });
  });

  it("counts all as pendientes and porPreparar for Sin empezar", () => {
    const pedidos = [
      { estado: "Sin empezar" },
      { estado: "Sin empezar" },
      { estado: "Sin empezar" },
    ];
    const stats = computePedidoStats(pedidos);
    expect(stats.statsTotal).toBe(3);
    expect(stats.statsPendientes).toBe(3);
    expect(stats.statsPorPreparar).toBe(3);
    expect(stats.statsRecogidos).toBe(0);
  });

  it("counts Recogido correctly (not pendientes)", () => {
    const pedidos = [
      { estado: "Recogido" },
      { estado: "Recogido" },
    ];
    const stats = computePedidoStats(pedidos);
    expect(stats.statsTotal).toBe(2);
    expect(stats.statsRecogidos).toBe(2);
    expect(stats.statsPendientes).toBe(0);
  });

  it("handles full mix of all 6 estados", () => {
    const pedidos = [
      { estado: "Sin empezar" },
      { estado: "En preparación" },
      { estado: "Listo para recoger" },
      { estado: "Recogido" },
      { estado: "No acude" },
      { estado: "Incidencia" },
    ];
    const stats = computePedidoStats(pedidos);
    expect(stats.statsTotal).toBe(6);
    expect(stats.statsPendientes).toBe(3); // Sin empezar + En preparación + Listo para recoger
    expect(stats.statsRecogidos).toBe(1); // only Recogido
    expect(stats.statsPorPreparar).toBe(2); // Sin empezar + En preparación
    expect(stats.statsListoRecoger).toBe(1);
  });

  it("counts No acude and Incidencia as complete (not pendientes, not recogidos)", () => {
    const pedidos = [
      { estado: "No acude" },
      { estado: "Incidencia" },
    ];
    const stats = computePedidoStats(pedidos);
    expect(stats.statsTotal).toBe(2);
    expect(stats.statsPendientes).toBe(0);
    expect(stats.statsRecogidos).toBe(0);
    expect(stats.statsPorPreparar).toBe(0);
    expect(stats.statsListoRecoger).toBe(0);
  });

  it("counts Listo para recoger as both pendientes and listoRecoger", () => {
    const pedidos = [{ estado: "Listo para recoger" }];
    const stats = computePedidoStats(pedidos);
    expect(stats.statsPendientes).toBe(1);
    expect(stats.statsListoRecoger).toBe(1);
    expect(stats.statsPorPreparar).toBe(0);
  });

  it("handles unknown estado gracefully (counts as pendientes)", () => {
    const pedidos = [{ estado: "DesconocidoXYZ" }];
    const stats = computePedidoStats(pedidos);
    expect(stats.statsTotal).toBe(1);
    // Unknown estado: ESTADOS[estado]?.group is undefined, which !== "complete", so pendientes++
    expect(stats.statsPendientes).toBe(1);
    expect(stats.statsRecogidos).toBe(0);
  });
});
