import { fmt } from "./fmt.js";

// ─── MAÑANA / TARDE DETECTION ───
export function esTarde(p) {
  const notas = (p.notas || "").toLowerCase();
  if (notas.includes("tarde")) return true;
  const horaMatch = notas.match(/\b(\d{1,2})[:\s]?[h0-9]*/);
  if (horaMatch && parseInt(horaMatch[1], 10) >= 17) return true;
  const hora = p.hora || fmt.time(p.fecha);
  if (hora && parseInt(hora.split(":")[0], 10) >= 17) return true;
  return false;
}

// ─── WHATSAPP LINK ───
export function waLink(tel) {
  const clean = (tel || "").replace(/[\s\-().]/g, "");
  const num = clean.startsWith("+") ? clean.slice(1) : clean.startsWith("34") ? clean : `34${clean}`;
  return `https://wa.me/${num}`;
}

// ─── PARSE PRODUCTS STRING ("2x Brownie, 1x Cookie") ───
export function parseProductsStr(str) {
  if (!str || typeof str !== "string") return [];
  return str.split(",").map(s => {
    const m = s.trim().match(/^(\d+)x\s+(.+)$/);
    return m ? { nombre: m[2].trim(), unidades: parseInt(m[1], 10) } : null;
  }).filter(Boolean);
}

// ─── DATE SUGGESTIONS (scoring for delivery date optimization) ───
export function computeDateSuggestions(produccionRango, lineas) {
  if (!produccionRango || !lineas || lineas.length === 0) return [];
  const selected = new Set(lineas.map(l => l.nombre.toLowerCase().trim()));
  return Object.entries(produccionRango)
    .map(([date, productos]) => {
      const overlapping = productos.filter(p => selected.has(p.nombre.toLowerCase().trim()));
      const overlapCount = overlapping.length;
      const overlapUnits = overlapping.reduce((s, p) => s + p.totalUnidades, 0);
      const score = overlapCount * 3 + overlapUnits;
      return { date, score, overlapCount, overlapUnits, overlapping };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
}
