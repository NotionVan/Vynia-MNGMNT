import { describe, it, expect, vi, afterEach } from "vitest";

describe("crearPedido", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates pedido then registros in correct order", async () => {
    const calls = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url, opts) => {
      calls.push({ url, method: opts?.method || "GET" });
      if (url.includes("/api/pedidos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "pedido-new" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });
    }));

    const { notion } = await import("../src/api.js");
    const result = await notion.crearPedido(
      "Maria Garcia", "client-1", "2026-03-04", "10:00", true, "Sin nueces",
      [
        { nombre: "Brownie", cantidad: 2, precio: 4.0 },
        { nombre: "Cookie Oreo", cantidad: 3, precio: 2.3 },
      ]
    );

    expect(result.id).toBe("pedido-new");
    expect(calls).toHaveLength(3);
    expect(calls[0].method).toBe("POST"); // pedido
    expect(calls[0].url).toContain("/api/pedidos");
    expect(calls[1].url).toContain("/api/registros");
    expect(calls[2].url).toContain("/api/registros");
  });

  it("builds fecha with hora when provided", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "p-1" }),
    }));

    const { notion } = await import("../src/api.js");
    await notion.crearPedido("Test", "c-1", "2026-03-04", "14:30", false, "", []);

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body);
    expect(body.properties["Fecha entrega"].date.start).toBe("2026-03-04T14:30:00");
  });

  it("builds fecha without hora when empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "p-2" }),
    }));

    const { notion } = await import("../src/api.js");
    await notion.crearPedido("Test", "c-1", "2026-03-04", "", false, "", []);

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body);
    expect(body.properties["Fecha entrega"].date.start).toBe("2026-03-04");
  });

  it("throws when pedido creation returns no id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }));

    const { notion } = await import("../src/api.js");
    await expect(
      notion.crearPedido("Test", "c-1", "2026-03-04", "", false, "", [
        { nombre: "Brownie", cantidad: 1, precio: 4 },
      ])
    ).rejects.toThrow("No se pudo crear el pedido");
  });

  it("BUG-13 FIX: partial registro failure reports missing products", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "p-partial" }) });
      }
      if (callCount === 2) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
      }
      // 3rd call (2nd registro) fails
      return Promise.resolve({
        ok: false, status: 429,
        json: () => Promise.resolve({ error: "Rate limited" }),
      });
    }));

    const { notion } = await import("../src/api.js");
    await expect(
      notion.crearPedido("Test", "c-1", "2026-03-04", "", false, "", [
        { nombre: "Brownie", cantidad: 2, precio: 4 },
        { nombre: "Cookie", cantidad: 3, precio: 2.3 },
      ])
    ).rejects.toThrow("Pedido creado pero faltan productos: Cookie");

    // Pedido exists with Brownie only — user sees which product failed
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("BUG-13 FIX: all registros fail reports all missing products", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "p-allfail" }) });
      }
      return Promise.resolve({
        ok: false, status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      });
    }));

    const { notion } = await import("../src/api.js");
    await expect(
      notion.crearPedido("Test", "c-1", "2026-03-04", "", false, "", [
        { nombre: "Brownie", cantidad: 2, precio: 4 },
        { nombre: "Cookie", cantidad: 3, precio: 2.3 },
      ])
    ).rejects.toThrow("Pedido creado pero faltan productos: Brownie, Cookie");
  });
});
