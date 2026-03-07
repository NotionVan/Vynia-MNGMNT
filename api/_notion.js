import { Client } from "@notionhq/client";

const _client = new Client({ auth: process.env.NOTION_TOKEN });

// ─── Retry con backoff exponencial (429, 502, 503) ───
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const retryable = err?.status === 429 || err?.status === 502 || err?.status === 503;
      if (attempt === maxRetries || !retryable) throw err;
      const wait = Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 500;
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// Proxy: intercepta notion.*.method() y envuelve con retry automático
export const notion = new Proxy(_client, {
  get(target, ns) {
    const val = target[ns];
    if (!val || typeof val !== "object") return val;
    return new Proxy(val, {
      get(nsTarget, method) {
        if (typeof nsTarget[method] !== "function") return nsTarget[method];
        return (...args) => withRetry(() => nsTarget[method].call(nsTarget, ...args));
      },
    });
  },
});

// ─── Cache server-side (persiste en instancias warm de Vercel) ───
const _cache = new Map();
export async function cached(key, ttlMs, fn) {
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  const data = await fn();
  _cache.set(key, { data, ts: Date.now() });
  return data;
}

// ─── Delay entre writes secuenciales ───
export const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Notion property names with quirks ───
// "Unidades " has a trailing space in Notion — defined here to avoid silent breakage
export const PROP_UNIDADES = "Unidades ";

// ─── Shared DB IDs ───
export const DB_PRODUCTOS = "1c418b3a-38b1-8186-8da9-cfa6c2f0fcd2";
export const DB_REGISTROS = "1d418b3a-38b1-808b-9afb-c45193c1270b";

// ─── Shared catalog loader (cached 5min, used by registros.js + parse-order.js) ───
export async function loadCatalog() {
  return cached("productos", 1800000, async () => {
    const result = [];
    let cursor;
    do {
      const resp = await notion.databases.query({
        database_id: DB_PRODUCTOS,
        start_cursor: cursor,
        page_size: 100,
      });
      for (const page of resp.results) {
        const p = page.properties;
        const nombre = p["Nombre"]?.title?.[0]?.plain_text?.trim();
        const precio = p["Precio"]?.number;
        const cat = p["Categoría"]?.select?.name || "";
        if (nombre && precio != null) {
          result.push({ nombre, precio, cat });
        }
      }
      cursor = resp.has_more ? resp.next_cursor : undefined;
    } while (cursor);
    result.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return result;
  });
}
