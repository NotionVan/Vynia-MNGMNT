import { ESTADOS, ESTADO_TRANSITIONS } from "../constants/estados.js";

export function computePedidoStats(pedidos) {
  let total = 0, pendientes = 0, recogidos = 0, porPreparar = 0, listoRecoger = 0;
  for (const p of pedidos) {
    total++;
    const g = ESTADOS[p.estado]?.group;
    if (p.estado === "Recogido") recogidos++;
    else if (g !== "complete") pendientes++;
    if (p.estado === "Sin empezar" || p.estado === "En preparación") porPreparar++;
    if (p.estado === "Listo para recoger") listoRecoger++;
  }
  return { statsTotal: total, statsPendientes: pendientes, statsRecogidos: recogidos, statsPorPreparar: porPreparar, statsListoRecoger: listoRecoger };
}

export function computeBulkTransitions(pedidos, bulkSelected) {
  if (bulkSelected.size === 0) return [];
  const selected = pedidos.filter(p => bulkSelected.has(p.id));
  if (selected.length === 0) return [];
  const sets = selected.map(p => new Set(ESTADO_TRANSITIONS[p.estado] || []));
  return [...sets[0]].filter(est => sets.every(s => s.has(est)));
}
