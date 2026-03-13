const API_BASE = "/api";

// ─── Request deduplication ───
const _inflight = new Map();
// POST dedup: hash(path+body) → {promise, ts}. Window 5s to prevent double-submit.
const _postDedup = new Map();
const POST_DEDUP_WINDOW = 5000;

// ─── In-memory cache with SWR (GET only) ───
const _cache = new Map();
const CACHE_TTL = 45000;

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  const fresh = Date.now() - entry.ts <= CACHE_TTL;
  return { data: entry.data, fresh };
}

export function invalidateApiCache() { _cache.clear(); _postDedup.clear(); }

export function invalidatePedidosCache() {
  for (const key of _cache.keys()) {
    if (key.startsWith("GET:/pedidos")) _cache.delete(key);
  }
}

const DEFAULT_TIMEOUT = 10000;
const SLOW_PATHS = ["/parse-order"];

function doFetch(path, options = {}) {
  return (async () => {
    const timeout = SLOW_PATHS.some(p => path.startsWith(p)) ? 15000 : DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
        signal: controller.signal,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `API Error ${res.status}`);
      }
      return res.json();
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error(`Tiempo de espera agotado (${timeout / 1000}s)`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  })();
}

async function apiCall(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const key = method === "GET" ? `GET:${path}` : null;

  // Dedup: return existing in-flight promise for same GET
  if (key && _inflight.has(key)) return _inflight.get(key);

  // POST dedup: same path+body within 5s returns the original promise
  if (method === "POST" && options.body) {
    const postKey = `POST:${path}:${options.body}`;
    const existing = _postDedup.get(postKey);
    if (existing && Date.now() - existing.ts < POST_DEDUP_WINDOW) return existing.promise;
  }

  // Cache: return fresh data or stale data with background revalidation (SWR)
  if (key) {
    const cached = getCached(key);
    if (cached) {
      if (cached.fresh) return cached.data;
      // Stale: return immediately, revalidate in background
      const bgFetch = doFetch(path, options);
      bgFetch
        .then(data => _cache.set(key, { data, ts: Date.now() }))
        .catch(() => {}); // fire-and-forget
      return cached.data;
    }
  }

  const promise = doFetch(path, options);

  if (key) {
    _inflight.set(key, promise);
    promise.then(data => _cache.set(key, { data, ts: Date.now() })).finally(() => _inflight.delete(key));
  }

  // Store POST promise for dedup window
  if (method === "POST" && options.body) {
    const postKey = `POST:${path}:${options.body}`;
    _postDedup.set(postKey, { promise, ts: Date.now() });
    promise.finally(() => setTimeout(() => _postDedup.delete(postKey), POST_DEDUP_WINDOW));
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

    // Create line items in a single batch request
    const regResult = await apiCall("/registros", {
      method: "POST",
      body: JSON.stringify({
        pedidoPageId: pedidoRes.id,
        lineas: lineas.map(l => ({ productoNombre: l.nombre, cantidad: l.cantidad })),
      }),
    });
    if (regResult.failed?.length > 0) {
      throw new Error(`Pedido creado pero faltan productos: ${regResult.failed.join(", ")}`);
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

  async loadSurplus(fecha) {
    return apiCall(`/produccion?surplus=true&fecha=${fecha}`);
  },

  async saveSurplus(fecha, plan) {
    return apiCall("/produccion", {
      method: "POST",
      body: JSON.stringify({ surplus: true, fecha, plan }),
    });
  },

  async loadProductos() {
    return apiCall("/registros?productos=true");
  },

  async loadHorario() {
    return apiCall("/horario");
  },

  async saveHorarioDia(dia, data) {
    return apiCall("/horario", {
      method: "PATCH",
      body: JSON.stringify({ dia, ...data }),
    });
  },

  async parseWhatsApp(text, senderName, senderPhone, imageBase64) {
    return apiCall("/parse-order", {
      method: "POST",
      body: JSON.stringify({ text, senderName, senderPhone, imageBase64 }),
    });
  },
};
