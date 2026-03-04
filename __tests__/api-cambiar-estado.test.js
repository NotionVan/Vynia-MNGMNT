import { describe, it, expect, vi, afterEach } from "vitest";

describe("cambiarEstado dual-write", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends Estado status + checkbox sync for Recogido", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { notion } = await import("../src/api.js");
    await notion.cambiarEstado("pedido-123", "Recogido");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.properties.Estado.status.name).toBe("Recogido");
    expect(body.properties.Recogido.checkbox).toBe(true);
    expect(body.properties["No acude"].checkbox).toBe(false);
    expect(body.properties.Incidencia.checkbox).toBe(false);
  });

  it("sends checkbox sync for No acude", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { notion } = await import("../src/api.js");
    await notion.cambiarEstado("pedido-456", "No acude");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.properties.Recogido.checkbox).toBe(false);
    expect(body.properties["No acude"].checkbox).toBe(true);
    expect(body.properties.Incidencia.checkbox).toBe(false);
  });

  it("sends checkbox sync for Incidencia", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { notion } = await import("../src/api.js");
    await notion.cambiarEstado("pedido-789", "Incidencia");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.properties.Recogido.checkbox).toBe(false);
    expect(body.properties["No acude"].checkbox).toBe(false);
    expect(body.properties.Incidencia.checkbox).toBe(true);
  });

  it("all checkboxes false for non-terminal estado", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { notion } = await import("../src/api.js");
    await notion.cambiarEstado("pedido-000", "En preparacion");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.properties.Recogido.checkbox).toBe(false);
    expect(body.properties["No acude"].checkbox).toBe(false);
    expect(body.properties.Incidencia.checkbox).toBe(false);
  });
});
