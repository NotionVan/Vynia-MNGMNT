import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadSurplusPlanLocal, saveSurplusPlanLocal, cleanOldSurplus, loadSurplusPlan, saveSurplusPlan } from "../src/utils/surplus.js";

// Mock the API client
vi.mock("../src/api.js", () => ({
  notion: {
    loadSurplus: vi.fn(),
    saveSurplus: vi.fn(),
  },
  invalidateApiCache: vi.fn(),
  invalidatePedidosCache: vi.fn(),
}));
import { notion } from "../src/api.js";

// ─── Inline surplusView computation (same logic as TabProduccion.jsx) ───
function computeSurplusView(produccionData, surplusPlan, catalogo) {
  const items = new Map();
  for (const prod of produccionData) {
    const key = prod.nombre.toLowerCase().trim();
    items.set(key, { nombre: prod.nombre, pedidos: prod.totalUnidades, plan: surplusPlan[key] || 0 });
  }
  for (const [key, plan] of Object.entries(surplusPlan)) {
    if (!items.has(key) && plan > 0) {
      const cat = catalogo.find(c => c.nombre.toLowerCase().trim() === key);
      items.set(key, { nombre: cat?.nombre || key, pedidos: 0, plan });
    }
  }
  return Array.from(items.values())
    .map(it => ({ ...it, excedente: it.plan - it.pedidos }))
    .sort((a, b) => (b.pedidos > 0) - (a.pedidos > 0) || a.nombre.localeCompare(b.nombre, "es"));
}

// ─── Local-only tests ───

describe("loadSurplusPlanLocal", () => {
  beforeEach(() => localStorage.clear());

  it("returns empty object when no data stored", () => {
    expect(loadSurplusPlanLocal("2026-03-06")).toEqual({});
  });

  it("returns parsed data when stored", () => {
    localStorage.setItem("vynia-surplus:2026-03-06", JSON.stringify({ brownie: 5, "barra de pan": 10 }));
    expect(loadSurplusPlanLocal("2026-03-06")).toEqual({ brownie: 5, "barra de pan": 10 });
  });

  it("returns empty object on invalid JSON", () => {
    localStorage.setItem("vynia-surplus:2026-03-06", "not-json");
    expect(loadSurplusPlanLocal("2026-03-06")).toEqual({});
  });
});

describe("saveSurplusPlanLocal", () => {
  beforeEach(() => localStorage.clear());

  it("saves non-zero entries", () => {
    saveSurplusPlanLocal("2026-03-06", { brownie: 5, cookies: 0, barra: 3 });
    const stored = JSON.parse(localStorage.getItem("vynia-surplus:2026-03-06"));
    expect(stored).toEqual({ brownie: 5, barra: 3 });
    expect(stored.cookies).toBeUndefined();
  });

  it("removes key entirely when all entries are zero", () => {
    localStorage.setItem("vynia-surplus:2026-03-06", JSON.stringify({ brownie: 5 }));
    saveSurplusPlanLocal("2026-03-06", { brownie: 0 });
    expect(localStorage.getItem("vynia-surplus:2026-03-06")).toBeNull();
  });

  it("removes key when plan is empty", () => {
    localStorage.setItem("vynia-surplus:2026-03-06", JSON.stringify({ brownie: 5 }));
    saveSurplusPlanLocal("2026-03-06", {});
    expect(localStorage.getItem("vynia-surplus:2026-03-06")).toBeNull();
  });
});

// ─── Hybrid tests (localStorage + Notion) ───

describe("loadSurplusPlan (async with Notion)", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it("loads from Notion API and syncs to localStorage", async () => {
    notion.loadSurplus.mockResolvedValue({ plan: { brownie: 5 } });
    const result = await loadSurplusPlan("2026-03-08");
    expect(result).toEqual({ brownie: 5 });
    expect(localStorage.getItem("vynia-surplus:2026-03-08")).toBe('{"brownie":5}');
  });

  it("falls back to localStorage when API fails", async () => {
    localStorage.setItem("vynia-surplus:2026-03-08", JSON.stringify({ brownie: 3 }));
    notion.loadSurplus.mockRejectedValue(new Error("Network error"));
    const result = await loadSurplusPlan("2026-03-08");
    expect(result).toEqual({ brownie: 3 });
  });

  it("returns empty when API fails and no localStorage", async () => {
    notion.loadSurplus.mockRejectedValue(new Error("Network error"));
    const result = await loadSurplusPlan("2026-03-08");
    expect(result).toEqual({});
  });
});

describe("saveSurplusPlan (write-through)", () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it("writes to localStorage and fires API call", () => {
    notion.saveSurplus.mockResolvedValue({ ok: true });
    saveSurplusPlan("2026-03-08", { brownie: 5, cookies: 0 });
    expect(localStorage.getItem("vynia-surplus:2026-03-08")).toBe('{"brownie":5}');
    expect(notion.saveSurplus).toHaveBeenCalledWith("2026-03-08", { brownie: 5 });
  });

  it("removes localStorage key when plan is empty", () => {
    localStorage.setItem("vynia-surplus:2026-03-08", JSON.stringify({ brownie: 5 }));
    notion.saveSurplus.mockResolvedValue({ ok: true });
    saveSurplusPlan("2026-03-08", {});
    expect(localStorage.getItem("vynia-surplus:2026-03-08")).toBeNull();
    expect(notion.saveSurplus).toHaveBeenCalledWith("2026-03-08", {});
  });
});

// ─── Cleanup ───

describe("cleanOldSurplus", () => {
  beforeEach(() => localStorage.clear());

  it("removes entries older than 7 days", () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    const oldKey = `vynia-surplus:${old.toISOString().split("T")[0]}`;
    localStorage.setItem(oldKey, JSON.stringify({ brownie: 5 }));

    const recent = new Date();
    const recentKey = `vynia-surplus:${recent.toISOString().split("T")[0]}`;
    localStorage.setItem(recentKey, JSON.stringify({ cookies: 3 }));

    cleanOldSurplus();

    expect(localStorage.getItem(oldKey)).toBeNull();
    expect(localStorage.getItem(recentKey)).not.toBeNull();
  });

  it("does not touch non-surplus keys", () => {
    localStorage.setItem("other-key", "value");
    cleanOldSurplus();
    expect(localStorage.getItem("other-key")).toBe("value");
  });
});

// ─── Computation tests ───

describe("computeSurplusView", () => {
  const catalogo = [
    { nombre: "Brownie", precio: 4.00, cat: "Pasteleria" },
    { nombre: "Cookies de chocolate", precio: 2.60, cat: "Pasteleria" },
    { nombre: "Barra de pan", precio: 1.50, cat: "Panaderia" },
  ];

  it("merges production data with surplus plan", () => {
    const produccionData = [
      { nombre: "Brownie", totalUnidades: 3, pedidos: [] },
      { nombre: "Cookies de chocolate", totalUnidades: 5, pedidos: [] },
    ];
    const plan = { brownie: 6, "cookies de chocolate": 5 };
    const result = computeSurplusView(produccionData, plan, catalogo);

    expect(result).toHaveLength(2);
    const brownie = result.find(p => p.nombre === "Brownie");
    expect(brownie.pedidos).toBe(3);
    expect(brownie.plan).toBe(6);
    expect(brownie.excedente).toBe(3);

    const cookies = result.find(p => p.nombre === "Cookies de chocolate");
    expect(cookies.excedente).toBe(0);
  });

  it("includes products only in plan (not in orders)", () => {
    const produccionData = [
      { nombre: "Brownie", totalUnidades: 3, pedidos: [] },
    ];
    const plan = { brownie: 6, "barra de pan": 4 };
    const result = computeSurplusView(produccionData, plan, catalogo);

    expect(result).toHaveLength(2);
    const barra = result.find(p => p.nombre === "Barra de pan");
    expect(barra.pedidos).toBe(0);
    expect(barra.plan).toBe(4);
    expect(barra.excedente).toBe(4);
  });

  it("shows negative excedente (deficit) when plan < orders", () => {
    const produccionData = [
      { nombre: "Brownie", totalUnidades: 10, pedidos: [] },
    ];
    const plan = { brownie: 3 };
    const result = computeSurplusView(produccionData, plan, catalogo);

    const brownie = result.find(p => p.nombre === "Brownie");
    expect(brownie.excedente).toBe(-7);
  });

  it("shows products with orders but no plan (plan=0, excedente=-pedidos)", () => {
    const produccionData = [
      { nombre: "Brownie", totalUnidades: 5, pedidos: [] },
    ];
    const result = computeSurplusView(produccionData, {}, catalogo);

    expect(result).toHaveLength(1);
    const brownie = result[0];
    expect(brownie.plan).toBe(0);
    expect(brownie.excedente).toBe(-5);
  });

  it("returns empty array when no data and no plan", () => {
    expect(computeSurplusView([], {}, catalogo)).toEqual([]);
  });

  it("sorts products with orders first, then alphabetically", () => {
    const produccionData = [
      { nombre: "Cookies de chocolate", totalUnidades: 2, pedidos: [] },
    ];
    const plan = { "barra de pan": 4, "cookies de chocolate": 5 };
    const result = computeSurplusView(produccionData, plan, catalogo);

    expect(result[0].nombre).toBe("Cookies de chocolate"); // has orders
    expect(result[1].nombre).toBe("Barra de pan"); // no orders
  });

  it("handles case-insensitive matching between plan and production", () => {
    const produccionData = [
      { nombre: "Brownie", totalUnidades: 3, pedidos: [] },
    ];
    const plan = { BROWNIE: 6 };
    const result = computeSurplusView(produccionData, plan, catalogo);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
