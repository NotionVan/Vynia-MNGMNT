// ─── ESTADO CONFIG ───
export const ESTADOS = {
  "Sin empezar": { group: "to_do", color: "#8B8B8B", bg: "#F0F0F0", label: "Sin empezar", icon: "○" },
  "En preparación": { group: "in_progress", color: "#1565C0", bg: "#E3F2FD", label: "Preparando", icon: "◐" },
  "Listo para recoger": { group: "in_progress", color: "#E65100", bg: "#FFF3E0", label: "Listo", icon: "●" },
  "Recogido": { group: "complete", color: "#2E7D32", bg: "#E8F5E9", label: "Recogido", icon: "✓" },
  "No acude": { group: "complete", color: "#C62828", bg: "#FFEBEE", label: "No acude", icon: "✗" },
  "Incidencia": { group: "complete", color: "#795548", bg: "#FDE8E5", label: "Incidencia", icon: "!" },
};

export const ESTADO_PROGRESS = {
  "Sin empezar": 0,
  "En preparación": 0.33,
  "Listo para recoger": 0.66,
  "Recogido": 1,
  "No acude": 1,
  "Incidencia": 1,
};

export const ESTADO_NEXT = {
  "Sin empezar": "En preparación",
  "En preparación": "Listo para recoger",
  "Listo para recoger": "Recogido",
};

// Action verbs for the primary pipeline button (what the user DOES, not the target state)
export const ESTADO_ACTION = {
  "En preparación": "Preparar",
  "Listo para recoger": "Listo para recoger",
  "Recogido": "Marcar recogido",
};

export const ESTADO_TRANSITIONS = {
  "Sin empezar": ["En preparación", "Listo para recoger", "Recogido", "No acude", "Incidencia"],
  "En preparación": ["Sin empezar", "Listo para recoger", "Recogido", "No acude", "Incidencia"],
  "Listo para recoger": ["Sin empezar", "En preparación", "Recogido", "No acude", "Incidencia"],
  "Recogido": ["Sin empezar", "En preparación", "Listo para recoger", "No acude", "Incidencia"],
  "No acude": ["Sin empezar", "En preparación", "Listo para recoger", "Recogido", "Incidencia"],
  "Incidencia": ["Sin empezar", "En preparación", "Listo para recoger", "Recogido", "No acude"],
};

export function effectiveEstado(raw) {
  // Estado status property is source of truth — trust it if present
  if (raw.estado) return raw.estado;
  // Legacy fallback: derive from checkboxes for pedidos without Estado
  if (raw.recogido) return "Recogido";
  if (raw.noAcude) return "No acude";
  if (raw.incidencia) return "Incidencia";
  return "Sin empezar";
}
