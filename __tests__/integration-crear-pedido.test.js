import { describe, it, expect, vi, afterEach } from "vitest";

describe("Integration: full pedido creation flow", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates pedido with properties and registros", async () => {
    const fetchMock = vi.fn().mockImplementation((url) => {
      if (url.includes("/api/pedidos")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "pedido-integration" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { notion } = await import("../src/api.js");
    const result = await notion.crearPedido(
      "Integration Test", "c-int", "2026-03-04", "10:00",
      true, "Notas test",
      [{ nombre: "Brownie", cantidad: 2, precio: 4.0 }]
    );

    expect(result.id).toBe("pedido-integration");

    // Verify pedido properties
    const pedidoBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(pedidoBody.properties.Pedido.title[0].text.content).toBe("Pedido Integration Test");
    expect(pedidoBody.properties.Estado.status.name).toBe("Sin empezar");
    expect(pedidoBody.properties["Pagado al reservar"].checkbox).toBe(true);
    expect(pedidoBody.properties.Notas.rich_text[0].text.content).toBe("Notas test");

    // Verify registro
    const registroBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(registroBody.productoNombre).toBe("Brownie");
    expect(registroBody.cantidad).toBe(2);
    expect(registroBody.pedidoPageId).toBe("pedido-integration");
  });
});

describe("Integration: API error propagation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("propagates error when pedido creation fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Database error" }),
    }));

    const { notion } = await import("../src/api.js");
    await expect(
      notion.crearPedido("Fail", "c-1", "2026-03-04", "", false, "", [
        { nombre: "Brownie", cantidad: 1, precio: 4 },
      ])
    ).rejects.toThrow("Database error");
  });
});
