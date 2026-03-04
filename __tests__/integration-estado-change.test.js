import { describe, it, expect, vi, afterEach } from "vitest";

describe("Integration: estado change flow", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends correct PATCH with dual-write properties", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { notion } = await import("../src/api.js");
    await notion.cambiarEstado("pedido-int", "Listo para recoger");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/pedidos/pedido-int");
    expect(options.method).toBe("PATCH");

    const body = JSON.parse(options.body);
    expect(body.properties.Estado.status.name).toBe("Listo para recoger");
    expect(body.properties.Recogido.checkbox).toBe(false);
    expect(body.properties["No acude"].checkbox).toBe(false);
    expect(body.properties.Incidencia.checkbox).toBe(false);
  });

  it("throws on failed PATCH", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Update failed" }),
    }));

    const { notion } = await import("../src/api.js");
    await expect(
      notion.cambiarEstado("pedido-fail", "Recogido")
    ).rejects.toThrow("Update failed");
  });
});
