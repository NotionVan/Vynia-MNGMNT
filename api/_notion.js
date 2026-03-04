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
