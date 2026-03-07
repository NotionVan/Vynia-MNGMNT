// ─── SURPLUS (localStorage helpers for planned production) ───
export const SURPLUS_KEY = "vynia-surplus:";

export function loadSurplusPlan(fecha) {
  try { return JSON.parse(localStorage.getItem(SURPLUS_KEY + fecha) || "{}"); }
  catch { return {}; }
}

export function saveSurplusPlan(fecha, plan) {
  const clean = Object.fromEntries(Object.entries(plan).filter(([, v]) => v > 0));
  if (Object.keys(clean).length) {
    localStorage.setItem(SURPLUS_KEY + fecha, JSON.stringify(clean));
  } else {
    localStorage.removeItem(SURPLUS_KEY + fecha);
  }
}

export function cleanOldSurplus() {
  const cutoff = Date.now() - 7 * 86400000;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(SURPLUS_KEY) && new Date(k.slice(SURPLUS_KEY.length)) < cutoff)
      localStorage.removeItem(k);
  }
}
