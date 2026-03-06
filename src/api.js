const API_BASE = "/api";

// ─── Request deduplication (GET only) ───
const _inflight = new Map();

// ─── In-memory cache with 30s TTL (GET only) ───
const _cache = new Map();
const CACHE_TTL = 45000;

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry || Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return entry.data;
}

export function invalidateApiCache() { _cache.clear(); }

export function invalidatePedidosCache() {
  for (const key of _cache.keys()) {
    if (key.startsWith("GET:/pedidos")) _cache.delete(key);
  }
}

async function apiCall(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const key = method === "GET" ? `GET:${path}` : null;

  // Dedup: return existing in-flight promise for same GET
  if (key && _inflight.has(key)) return _inflight.get(key);

  // Cache: return cached data if fresh
  if (key) {
    const cached = getCached(key);
    if (cached) return cached;
  }

  const promise = (async () => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errData.error || `API Error ${res.status}`);
    }
    return res.json();
  })();

  if (key) {
    _inflight.set(key, promise);
    promise.then(data => _cache.set(key, { data, ts: Date.now() })).finally(() => _inflight.delete(key));
  }

  return promise;
}

export const notion = {
  async loadAllPedidos() {
    return apiCall("/pedidos?filter=todos");
  },

  async loadPedidos() {
    return apiCall("/pedidos?filter=pendientes");
  },

  async loadPedidosByDate(fecha) {
    const params = fecha ? `?fecha=${fecha}` : "?filter=todos";
    return apiCall(`/pedidos${params}`);
  },

  async loadPedidosByCliente(clienteId) {
    return apiCall(`/pedidos?clienteId=${clienteId}&_t=${Date.now()}`);
  },

  async cambiarEstado(pageId, nuevoEstado) {
    // Dual-write: update Estado + sync corresponding checkboxes
    const checkboxSync = {
      Recogido: { checkbox: nuevoEstado === "Recogido" },
      "No acude": { checkbox: nuevoEstado === "No acude" },
      Incidencia: { checkbox: nuevoEstado === "Incidencia" },
    };
    return apiCall(`/pedidos/${pageId}`, {
      method: "PATCH",
      body: JSON.stringify({
        properties: {
          Estado: { status: { name: nuevoEstado } },
          ...checkboxSync,
        },
      }),
    });
  },

  async updatePage(pageId, properties) {
    return apiCall(`/pedidos/${pageId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
  },

  async archivarPedido(pageId) {
    return apiCall(`/pedidos/${pageId}`, {
      method: "PATCH",
      body: JSON.stringify({ archived: true }),
    });
  },

  async searchClientes(q) {
    return apiCall(`/clientes?q=${encodeURIComponent(q)}`);
  },

  async updateCliente(id, { nombre, telefono, email }) {
    return apiCall("/clientes", {
      method: "PATCH",
      body: JSON.stringify({ id, nombre, telefono, email }),
    });
  },

  async findOrCreateCliente(nombre, telefono) {
    return apiCall("/clientes", {
      method: "POST",
      body: JSON.stringify({ nombre, telefono }),
    });
  },

  async crearPedido(clienteNombre, clientePageId, fecha, hora, pagado, notas, lineas) {
    const fechaStr = hora ? `${fecha}T${hora}:00` : fecha;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const properties = {
      Pedido: {
        title: [{ text: { content: `Pedido ${clienteNombre}` } }],
      },
      Clientes: {
        relation: [{ id: clientePageId }],
      },
      "Fecha entrega": {
        date: { start: fechaStr },
      },
      "Fecha Creación": {
        date: { start: today },
      },
      "Pagado al reservar": {
        checkbox: pagado,
      },
      Estado: {
        status: { name: "Sin empezar" },
      },
    };

    if (notas) {
      properties["Notas"] = {
        rich_text: [{ text: { content: notas } }],
      };
    }

    const pedidoRes = await apiCall("/pedidos", {
      method: "POST",
      body: JSON.stringify({ properties }),
    });

    if (!pedidoRes?.id) throw new Error("No se pudo crear el pedido");

    // Create line items (track partial failures — Notion has no transactions)
    const failed = [];
    for (const linea of lineas) {
      try {
        await apiCall("/registros", {
          method: "POST",
          body: JSON.stringify({
            pedidoPageId: pedidoRes.id,
            productoNombre: linea.nombre,
            cantidad: linea.cantidad,
          }),
        });
      } catch {
        failed.push(linea.nombre);
      }
    }
    if (failed.length > 0) {
      throw new Error(`Pedido creado pero faltan productos: ${failed.join(", ")}`);
    }

    return pedidoRes;
  },

  async crearRegistro(pedidoPageId, productoNombre, cantidad) {
    return apiCall("/registros", {
      method: "POST",
      body: JSON.stringify({ pedidoPageId, productoNombre, cantidad }),
    });
  },

  async loadRegistros(pedidoId) {
    return apiCall(`/registros?pedidoId=${pedidoId}`);
  },

  async deleteRegistros(registroIds) {
    return apiCall("/registros", {
      method: "DELETE",
      body: JSON.stringify({ registroIds }),
    });
  },

  async findOrphanRegistros() {
    return apiCall(`/registros?orphans=true&_t=${Date.now()}`);
  },

  async loadProduccion(fecha) {
    return apiCall(`/produccion?fecha=${fecha}`);
  },

  async loadProduccionRango(fecha, rango = 7) {
    return apiCall(`/produccion?fecha=${fecha}&rango=${rango}`);
  },

  async loadProductos() {
    return apiCall("/registros?productos=true");
  },

  async parseWhatsApp(text, senderName, senderPhone, imageBase64) {
    return apiCall("/parse-order", {
      method: "POST",
      body: JSON.stringify({ text, senderName, senderPhone, imageBase64 }),
    });
  },
};
