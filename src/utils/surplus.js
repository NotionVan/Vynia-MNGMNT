import { notion } from "../api.js";

// ─── SURPLUS (hybrid localStorage + Notion for cross-device sync) ───
export const SURPLUS_KEY = "vynia-surplus:";

// ─── Local-only (synchronous) ───

export function loadSurplusPlanLocal(fecha) {
  try { return JSON.parse(localStorage.getItem(SURPLUS_KEY + fecha) || "{}"); }
  catch { return {}; }
}

export function saveSurplusPlanLocal(fecha, plan) {
  const clean = Object.fromEntries(Object.entries(plan).filter(([, v]) => v > 0));
  if (Object.keys(clean).length) {
    localStorage.setItem(SURPLUS_KEY + fecha, JSON.stringify(clean));
  } else {
    localStorage.removeItem(SURPLUS_KEY + fecha);
  }
}

// ─── Hybrid (localStorage instant + Notion background) ───

export async function loadSurplusPlan(fecha) {
  try {
    const res = await notion.loadSurplus(fecha);
    const plan = res.plan || {};
    saveSurplusPlanLocal(fecha, plan);
    return plan;
  } catch {
    return loadSurplusPlanLocal(fecha);
  }
}

export function saveSurplusPlan(fecha, plan) {
  const clean = Object.fromEntries(Object.entries(plan).filter(([, v]) => v > 0));
  saveSurplusPlanLocal(fecha, clean);
  notion.saveSurplus(fecha, clean).catch(err => {
    console.warn("Failed to save surplus to Notion:", err.message);
  });
}

// ─── Cleanup (localStorage only, >7 days) ───

export function cleanOldSurplus() {
  const cutoff = Date.now() - 7 * 86400000;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(SURPLUS_KEY) && new Date(k.slice(SURPLUS_KEY.length)) < cutoff)
      localStorage.removeItem(k);
  }
}
