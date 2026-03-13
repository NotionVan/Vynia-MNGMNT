import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { invalidateApiCache } from "../src/api.js";

describe("crearPedido", () => {
  beforeEach(() => invalidateApiCache());
  afterEach(() => vi.restoreAllMocks());

  it("creates pedido then registros batch in correct order", async () => {
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
        json: () => Promise.resolve({ ok: true, created: 2, failed: [] }),
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
    expect(calls).toHaveLength(2); // 1 POST pedido + 1 POST registros batch
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toContain("/api/pedidos");
    expect(calls[1].url).toContain("/api/registros");
    // Verify batch body
    const regBody = JSON.parse(vi.mocked(fetch).mock.calls[1][1].body);
    expect(regBody.pedidoPageId).toBe("pedido-new");
    expect(regBody.lineas).toHaveLength(2);
    expect(regBody.lineas[0].productoNombre).toBe("Brownie");
    expect(regBody.lineas[1].productoNombre).toBe("Cookie Oreo");
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

  it("partial batch failure reports missing products", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // POST pedido OK
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "p-partial" }) });
      }
      // POST registros batch — partial failure reported by server
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, created: 1, failed: ["Cookie"] }) });
    }));

    const { notion } = await import("../src/api.js");
    await expect(
      notion.crearPedido("Test", "c-1", "2026-03-04", "", false, "", [
        { nombre: "Brownie", cantidad: 2, precio: 4 },
        { nombre: "Cookie", cantidad: 3, precio: 2.3 },
      ])
    ).rejects.toThrow("Pedido creado pero faltan productos: Cookie");

    expect(fetch).toHaveBeenCalledTimes(2); // 1 pedido + 1 batch
  });

  it("batch failure propagates server error", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "p-allfail" }) });
      }
      // Batch registros call fails entirely
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
    ).rejects.toThrow("Server error");
  });
});
