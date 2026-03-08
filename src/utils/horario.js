import { notion } from "../api.js";

// ─── HORARIO (hybrid localStorage + Notion for cross-device sync) ───
export const HORARIO_KEY = "vynia-horario";

// ─── Local-only (synchronous) ───

export function loadHorarioLocal() {
  try {
    const raw = localStorage.getItem(HORARIO_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveHorarioLocal(data) {
  if (!data) { localStorage.removeItem(HORARIO_KEY); return; }
  localStorage.setItem(HORARIO_KEY, JSON.stringify(data));
}

// ─── Hybrid (localStorage instant + Notion background) ───

export async function loadHorario() {
  try {
    const res = await notion.loadHorario();
    if (res?.horario) saveHorarioLocal(res);
    return res;
  } catch {
    return loadHorarioLocal();
  }
}

export async function saveHorarioDia(horarioState, dia, changes) {
  const updated = { ...horarioState };
  updated[dia] = { ...(updated[dia] || {}), ...changes };
  saveHorarioLocal({ horario: updated });

  // Await Notion sync — caller handles success/failure
  await notion.saveHorarioDia(dia, changes);
  return updated;
}

// ─── Pure functions ───

/** Map JS getDay() (0=Sunday) to BD Día index (0=Lunes...6=Domingo) */
export function jsDayToBdIndex(jsDay) {
  return (jsDay + 6) % 7;
}

/** Check if business is open on a given date string "YYYY-MM-DD" */
export function isOpenDay(horario, dateStr) {
  if (!horario || typeof horario !== "object") return true;
  // Check if horario has any keys (empty object → all open)
  if (Object.keys(horario).length === 0) return true;
  const d = new Date(dateStr + "T12:00:00"); // noon to avoid timezone issues
  if (isNaN(d.getTime())) return true; // invalid date → fail-open
  const bdIndex = jsDayToBdIndex(d.getDay());
  const entry = horario[bdIndex];
  if (!entry) return true; // no entry for this day → open by default
  return entry.abierto !== false; // explicitly false = closed, anything else = open
}

/** Get list of open dates in range [fromDate, fromDate + days) */
export function getOpenDaysInRange(horario, fromDate, days) {
  if (!days || days <= 0) return [];
  const result = [];
  const d = new Date(fromDate + "T12:00:00");
  if (isNaN(d.getTime())) return [];
  for (let i = 0; i < days; i++) {
    const dateStr = d.toISOString().split("T")[0];
    if (isOpenDay(horario, dateStr)) result.push(dateStr);
    d.setDate(d.getDate() + 1);
  }
  return result;
}
