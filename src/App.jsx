import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import NumberFlow from "@number-flow/react";
import { notion, invalidateApiCache, invalidatePedidosCache } from "./api.js";

// ════════════════════════════════════════════════════════════
//  VYNIA — Sistema de Gestión de Pedidos
//  Backend: Vercel Serverless → Notion API (direct)
//  Design: Vynia brand palette, desktop-first
// ════════════════════════════════════════════════════════════

const VYNIA_LOGO = "data:image/png;base64,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";
const VYNIA_LOGO_MD = "data:image/png;base64,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";



// ─── PRODUCT CATALOG FALLBACK (used for DEMO mode and initial load) ───
const CATALOGO_FALLBACK = [
  { nombre: "Cookies de chocolate y avellanas", precio: 2.60, cat: "Pastelería" },
  { nombre: "Cookies de chocolate blanco y pistachos", precio: 2.80, cat: "Pastelería" },
  { nombre: "Cookie Oreo", precio: 2.30, cat: "Pastelería" },
  { nombre: "Cookies veganas", precio: 2.30, cat: "Pastelería" },
  { nombre: "Cookies de kinder", precio: 2.50, cat: "Pastelería" },
  { nombre: "Brownie", precio: 4.00, cat: "Pastelería" },
  { nombre: "Brownie individual", precio: 1.80, cat: "Pastelería" },
  { nombre: "Brownie 500gr", precio: 16.70, cat: "Pastelería" },
  { nombre: "Brownie San Valentín", precio: 5.00, cat: "Pastelería" },
  { nombre: "Brookie", precio: 3.20, cat: "Pastelería" },
  { nombre: "Brookie San Valentín", precio: 5.00, cat: "Pastelería" },
  { nombre: "Blondie", precio: 2.60, cat: "Pastelería" },
  { nombre: "Viñacaos", precio: 2.50, cat: "Pastelería" },
  { nombre: "Bizcocho de naranja", precio: 3.30, cat: "Pastelería" },
  { nombre: "Bizcocho de limón", precio: 3.00, cat: "Pastelería" },
  { nombre: "Bizcocho de limón 400 g", precio: 12.00, cat: "Pastelería" },
  { nombre: "Bizcocho de Naranja 500gr", precio: 15.00, cat: "Pastelería" },
  { nombre: "Bizcocho de chocolate con nata", precio: 4.50, cat: "Pastelería" },
  { nombre: "Bizcocho chocolate y plátano (grande)", precio: 24.00, cat: "Pastelería" },
  { nombre: "Bizcocho de plátano y chocolate", precio: 3.20, cat: "Pastelería" },
  { nombre: "Magdalenas", precio: 1.50, cat: "Pastelería" },
  { nombre: "Magdalenas (azúcar de coco)", precio: 1.60, cat: "Pastelería" },
  { nombre: "Cupcakes", precio: 3.00, cat: "Pastelería" },
  { nombre: "Bollitos", precio: 1.50, cat: "Panadería" },
  { nombre: "Bollo Adolescente", precio: 1.70, cat: "Panadería" },
  { nombre: "Roll Fresa", precio: 3.20, cat: "Pastelería" },
  { nombre: "Roll Manzana", precio: 3.50, cat: "Pastelería" },
  { nombre: "Rollo de canela", precio: 3.50, cat: "Pastelería" },
  { nombre: "Granola 250Gr.", precio: 6.50, cat: "Pastelería" },
  { nombre: "Arroz con leche", precio: 2.00, cat: "Pastelería" },
  { nombre: "Arroz con leche sin lactosa", precio: 2.00, cat: "Pastelería" },
  { nombre: "Tarta de queso", precio: 5.50, cat: "Pastelería" },
  { nombre: "Tarta de queso sin lactosa", precio: 5.50, cat: "Pastelería" },
  { nombre: "Tarta de queso de pistacho", precio: 6.50, cat: "Pastelería" },
  { nombre: "Tarta de queso de pistacho sin lactosa", precio: 7.50, cat: "Pastelería" },
  { nombre: "Tarta de queso con frutos rojos San Valentín", precio: 7.00, cat: "Pastelería" },
  { nombre: "Tarta queso y pistacho San Valentín", precio: 8.00, cat: "Pastelería" },
  { nombre: "Vasito Tarta de la abuela", precio: 3.00, cat: "Pastelería" },
  { nombre: "Mini tarta", precio: 5.00, cat: "Pastelería" },
  { nombre: "Mini tarta (bizc. choc y crema kinder)", precio: 6.00, cat: "Pastelería" },
  { nombre: "Marquesas de almendra", precio: 1.30, cat: "Pastelería" },
  { nombre: "Pestiños", precio: 1.00, cat: "Pastelería" },
  { nombre: "Porción bizcocho choco", precio: 2.00, cat: "Pastelería" },
  { nombre: "Mini de queso y turrón", precio: 9.00, cat: "Pastelería" },
  { nombre: "Postre chocolate Navidad", precio: 9.50, cat: "Pastelería" },
  { nombre: "Postre de San Valentín", precio: 7.50, cat: "Pastelería" },
  { nombre: "Mantecados de chocolate y almendra", precio: 0.90, cat: "Pastelería" },
  { nombre: "Mantecados de aceite de oliva", precio: 0.90, cat: "Pastelería" },
  { nombre: "Polvorón de almendra", precio: 0.90, cat: "Pastelería" },
  { nombre: "Polvorón de limón", precio: 0.90, cat: "Pastelería" },
  { nombre: "Polvorón de chocolate", precio: 0.90, cat: "Pastelería" },
  { nombre: "Roscos de anís", precio: 1.30, cat: "Pastelería" },
  { nombre: "Tarta de queso y turrón (6-8 pax)", precio: 33.00, cat: "Pastelería" },
  { nombre: "Tarta de queso y turrón (10-12 pax)", precio: 49.00, cat: "Pastelería" },
  { nombre: "Tarta de queso y pistacho (10-12 pax)", precio: 47.00, cat: "Pastelería" },
  { nombre: "Torrijas Azúcar y Canela", precio: 1.80, cat: "Pastelería" },
  { nombre: "Torrijas Azúcar y Canela SIN LACTOSA", precio: 1.80, cat: "Pastelería" },
  { nombre: "Torrijas Miel", precio: 1.80, cat: "Pastelería" },
  { nombre: "Torrijas Miel SIN LACTOSA", precio: 1.80, cat: "Pastelería" },
  { nombre: "Torrijas sin proteína de la leche de la vaca", precio: 1.80, cat: "Pastelería" },
  { nombre: "Barra de pan", precio: 2.00, cat: "Panadería" },
  { nombre: "Hogaza rústica", precio: 5.50, cat: "Panadería" },
  { nombre: "Hogaza Pan de miel y semillas", precio: 5.50, cat: "Panadería" },
  { nombre: "1 kg Hogaza rústica", precio: 11.00, cat: "Panadería" },
  { nombre: "1 kg Hogaza Miel y semillas", precio: 11.00, cat: "Panadería" },
  { nombre: "Pan de molde con semillas 1/2", precio: 6.50, cat: "Panadería" },
  { nombre: "Pan de hamburguesa", precio: 3.00, cat: "Panadería" },
  { nombre: "Chapata", precio: 1.70, cat: "Panadería" },
  { nombre: "Pan de Torrijas", precio: 7.00, cat: "Panadería" },
].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

// ─── ESTADO CONFIG ───
const ESTADOS = {
  "Sin empezar": { group: "to_do", color: "#8B8B8B", bg: "#F0F0F0", label: "Sin empezar", icon: "○" },
  "En preparación": { group: "in_progress", color: "#1565C0", bg: "#E3F2FD", label: "Preparando", icon: "◐" },
  "Listo para recoger": { group: "in_progress", color: "#E65100", bg: "#FFF3E0", label: "Listo", icon: "●" },
  "Recogido": { group: "complete", color: "#2E7D32", bg: "#E8F5E9", label: "Recogido", icon: "✓" },
  "No acude": { group: "complete", color: "#C62828", bg: "#FFEBEE", label: "No acude", icon: "✗" },
  "Incidencia": { group: "complete", color: "#795548", bg: "#FDE8E5", label: "Incidencia", icon: "!" },
};
const ESTADO_PROGRESS = {
  "Sin empezar": 0,
  "En preparación": 0.33,
  "Listo para recoger": 0.66,
  "Recogido": 1,
  "No acude": 1,
  "Incidencia": 1,
};
const ESTADO_NEXT = {
  "Sin empezar": "En preparación",
  "En preparación": "Listo para recoger",
  "Listo para recoger": "Recogido",
};
// Action verbs for the primary pipeline button (what the user DOES, not the target state)
const ESTADO_ACTION = {
  "En preparación": "Preparar",
  "Listo para recoger": "Listo para recoger",
  "Recogido": "Marcar recogido",
};
const ESTADO_TRANSITIONS = {
  "Sin empezar": ["En preparación", "Listo para recoger", "Recogido", "No acude", "Incidencia"],
  "En preparación": ["Sin empezar", "Listo para recoger", "Recogido", "No acude", "Incidencia"],
  "Listo para recoger": ["Sin empezar", "En preparación", "Recogido", "No acude", "Incidencia"],
  "Recogido": ["Sin empezar", "En preparación", "Listo para recoger", "No acude", "Incidencia"],
  "No acude": ["Sin empezar", "En preparación", "Listo para recoger", "Recogido", "Incidencia"],
  "Incidencia": ["Sin empezar", "En preparación", "Listo para recoger", "Recogido", "No acude"],
};
function effectiveEstado(raw) {
  // Estado status property is source of truth — trust it if present
  if (raw.estado) return raw.estado;
  // Legacy fallback: derive from checkboxes for pedidos without Estado
  if (raw.recogido) return "Recogido";
  if (raw.noAcude) return "No acude";
  if (raw.incidencia) return "Incidencia";
  return "Sin empezar";
}

// Pre-computed price lookup (rebuilt when catalog loads from Notion)
let PRICE_MAP = {};
CATALOGO_FALLBACK.forEach(c => { PRICE_MAP[c.nombre.toLowerCase().trim()] = c.precio; });

// Most ordered products (for quick access)
const FRECUENTES = [
  "Cookies de chocolate blanco y pistachos",
  "Cookies de chocolate y avellanas",
  "Viñacaos",
  "Bizcocho de naranja",
  "Brookie",
  "Brownie",
  "Barra de pan",
  "1 kg Hogaza Miel y semillas",
];

// ─── ICONS ───
const I = {
  Search: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>,
  Plus: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  Check: (p = {}) => <svg width={p.s || 16} height={p.s || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>,
  Box: (p = {}) => <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" /></svg>,
  User: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  Cal: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect width="18" x="3" y="4" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  Clock: (p = {}) => <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
  Phone: (p = {}) => <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  Trash: (p = {}) => <svg width={p.s || 15} height={p.s || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  Refresh: (p = {}) => <svg width={p.s || 16} height={p.s || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>,
  Store: (p = {}) => <svg width={p.s || 22} height={p.s || 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9v12h18V9M3 9l1.5-5h15L21 9M3 9h18M9 21V13h6v8" /></svg>,
  Minus: (p = {}) => <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14" /></svg>,
  Alert: (p = {}) => <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>,
  Back: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>,
  Send: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z" /><path d="m22 2-11 11" /></svg>,
  List: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>,
  ClipboardList: (p = {}) => <svg width={p.s || 22} height={p.s || 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" /></svg>,
  ChefHat: (p = {}) => <svg width={p.s || 22} height={p.s || 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21H7" /><path d="M6 18V7a5 5 0 0 1 5-2.18A5 5 0 0 1 17.5 5 3.5 3.5 0 0 1 19 8.5 4.5 4.5 0 0 1 18 17H6Z" /></svg>,
  Tag: (p = {}) => <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2zM7 7h.01" /></svg>,
  Euro: () => <span style={{ fontWeight: 700, fontSize: 13 }}>€</span>,
  Printer: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>,
  Edit: (p = {}) => <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>,
  Ext: (p = {}) => <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  Broom: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m13 11 9-9" /><path d="M14.6 12.6c.8.8.8 2 0 2.8l-7.8 7.8H2v-4.8l7.8-7.8c.8-.8 2-.8 2.8 0z" /></svg>,
  Help: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>,
  Chevron: (p = {}) => <svg width={p.s || 12} height={p.s || 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>,
  Clipboard: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke={p.c || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>,
  Img: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke={p.c || "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>,
  AlertTri: (p = {}) => <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke={p.c || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  Mail: (p = {}) => <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke={p.c || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>,
  Mic: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke={p.c || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>,
  Gear: (p = {}) => <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke={p.c || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /></svg>,
  Info: (p = {}) => <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 12v4" /><path d="M12 8h.01" /></svg>,
  Menu: (p = {}) => <svg width={p.s || 20} height={p.s || 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>,
};

// ─── HELP CONTENT ───
const HELP_CONTENT = [
  {
    id: "pedidos", title: "Pedidos", icon: <I.Clipboard s={20} />,
    sections: [
      {
        title: "Filtrar pedidos",
        content: "Usa las pills de la parte superior para filtrar por estado: Total, Pendientes o Recogidos.",
        steps: ["Selecciona una fecha con los botones Hoy / Mañana / Pasado o el calendario", "Combina filtros de estado y fecha para encontrar pedidos concretos"],
        tip: "Las pills muestran el recuento de pedidos en cada estado",
      },
      {
        title: "Buscar clientes",
        content: "La barra de busqueda permite encontrar clientes por nombre, telefono o email.",
        steps: ["Escribe al menos 2 caracteres para iniciar la busqueda", "Pulsa en un resultado para abrir la ficha del cliente"],
      },
      {
        title: "Estados de pedidos",
        content: "Cada pedido pasa por un pipeline de estados con codigo de color.",
        steps: [
          "Sin empezar (gris) — pedido recibido",
          "En preparacion (azul) — en el obrador",
          "Listo para recoger (naranja) — terminado",
          "Recogido (verde) — entregado al cliente",
        ],
        tip: "Tambien existen los estados No acude (rojo) e Incidencia (marron) para situaciones especiales",
      },
      {
        title: "Avanzar estado (pipeline)",
        content: "Cada tarjeta tiene un boton de 1-tap que avanza al siguiente estado del pipeline.",
        steps: ["Pulsa el boton con el nombre del siguiente estado", "Confirma el cambio en el dialogo que aparece"],
        tip: "El pipeline sigue el orden: Sin empezar → En preparacion → Listo para recoger → Recogido",
      },
      {
        title: "Cambiar estado manualmente",
        content: "El boton ··· abre un selector con todos los estados posibles.",
        steps: ["Pulsa ··· en la tarjeta del pedido", "Selecciona el estado deseado", "Confirma el cambio"],
      },
      {
        title: "Seleccion multiple (bulk)",
        content: "Permite cambiar el estado de varios pedidos a la vez.",
        steps: ["Pulsa Seleccionar en la barra de filtros", "Marca los pedidos que quieras", "Usa la barra flotante inferior para elegir el nuevo estado"],
        tip: "Solo se muestran los estados comunes a todos los pedidos seleccionados",
      },
      {
        title: "Detalle del pedido",
        content: "Pulsa en una tarjeta para abrir el modal de detalle con toda la informacion.",
        steps: ["Edita las notas pulsando en el area de texto", "Cambia la fecha de entrega pulsando en la fecha", "Modifica los productos con el boton Modificar productos", "Marca o desmarca como pagado pulsando el badge €/PAGADO"],
      },
      {
        title: "Ficha de cliente",
        content: "Al buscar un cliente y seleccionarlo, se abre su ficha con historial de pedidos.",
        steps: ["Pulsa el icono de edicion para modificar nombre, telefono o email", "Pulsa el enlace externo para abrir la ficha en Notion"],
      },
      {
        title: "Telefono y WhatsApp",
        content: "Pulsa el numero de telefono de un pedido para ver opciones de contacto.",
        steps: ["Llamar abre el marcador del telefono", "WhatsApp abre una conversacion directa"],
        tip: "Al marcar un pedido como Listo para recoger, se ofrece enviar un aviso automatico por WhatsApp",
      },
      {
        title: "Toggle de precios",
        content: "El toggle 'Ver/Ocultar importes' junto a la barra de busqueda muestra u oculta los importes en las tarjetas.",
        tip: "Los precios estan ocultos por defecto",
      },
      {
        title: "Marcar como pagado",
        content: "Cada tarjeta tiene un boton € Pago / Pagado en la zona de acciones (junto al pipeline y al picker de estado). Tambien puedes cambiarlo desde el modal de detalle y la vista de Produccion.",
        steps: ["Pulsa el boton € Pago para marcar como pagado, o Pagado para desmarcar", "Confirma el cambio en el dialogo que aparece", "El cambio se guarda en Notion automaticamente"],
        tip: "El badge PAGADO en el nombre del pedido es solo informativo — usa el boton de la zona de acciones para cambiar el estado de pago",
      },
      {
        title: "Imprimir",
        content: "El boton de impresora en la cabecera imprime la lista de pedidos filtrada actual.",
        tip: "La impresion usa un formato optimizado para A4",
      },
    ],
  },
  {
    id: "nuevo", title: "Nuevo Pedido", icon: <I.Plus s={20} />,
    sections: [
      {
        title: "Paso 1: Datos del Pedido",
        content: "El formulario se divide en dos pasos. En el primer paso seleccionarás todos los datos relativos al pedido en sí:",
        steps: [
          "Selecciona un cliente o escribe uno nuevo. Si no existe se creará en Notion.",
          "Agrega productos desde el buscador o lista de frecuentes, y ajusta las unidades.",
          "Añade notas si lo necesitas y marca si el cliente ya lo ha dejado pagado.",
        ],
        tip: "Necesitas al menos un cliente y un producto seleccionado para avanzar al paso 2",
      },
      {
        title: "Paso 2: Fecha de Entrega y Creación",
        content: "En el segundo paso podrás seleccionar exclusivamente la fecha y hora.",
        steps: [
          "Pulsa en Siguiente: Elegir fecha cuando termines con los productos.",
          "Selecciona el día con los atajos Hoy / Mañana / Pasado o usa el calendario.",
          "Si te equivocas, usa el botón 'Volver a datos del pedido' para retroceder e introducir cambios.",
          "Pulsa Crear pedido para enviar todo."
        ],
        tip: "El pedido siempre se crea con estado Sin empezar."
      },
    ],
  },
  {
    id: "produccion", title: "Produccion", icon: <I.Store s={20} />,
    sections: [
      {
        title: "Seleccionar fecha",
        content: "Elige el dia para ver la produccion agregada.",
        steps: ["Usa los botones Hoy / Mañana / Pasado o el calendario"],
      },
      {
        title: "Filtros: Pendiente vs Todo el dia",
        content: "Controla que pedidos se incluyen en el recuento.",
        steps: ["Pendiente — resta los pedidos ya Listo para recoger y Recogido", "Todo el dia — muestra la produccion total sin descontar"],
        tip: "Usa Pendiente para saber cuanto queda por preparar",
      },
      {
        title: "Barra de resumen",
        content: "Muestra el total de productos distintos y unidades pendientes.",
        steps: ["Pulsa Desplegar/Contraer para expandir o colapsar todos los productos a la vez"],
      },
      {
        title: "Productos y pedidos",
        content: "Cada producto muestra la cantidad total y los pedidos que lo contienen.",
        steps: ["Pulsa un producto para ver los pedidos asociados", "Pulsa un pedido para abrir su detalle completo"],
        tip: "El badge de cada producto muestra el total de unidades",
      },
      {
        title: "Planificar produccion",
        content: "Encima de los filtros hay un desplegable para introducir la carga de produccion del dia. El sistema compara tu plan con los pedidos existentes y calcula automaticamente cuantas unidades quedan disponibles para venta directa (excedente = plan − pedidos).",
        steps: [
          "Pulsa la barra verde Planificar produccion para abrir el desplegable",
          "El chevron del header indica el estado: abajo = cerrado, arriba = abierto",
          "Pulsa de nuevo el header para cerrar el desplegable en cualquier momento",
        ],
        tip: "Pulsa el boton circular con la i (ℹ) en el header para ver una explicacion detallada dentro de la propia seccion",
      },
      {
        title: "Anadir productos al plan",
        content: "Dentro del desplegable abierto puedes buscar productos del catalogo o usar los accesos rapidos.",
        steps: [
          "Escribe en el buscador para filtrar productos del catalogo",
          "Pulsa un resultado para anadirlo con cantidad 1",
          "Si no hay productos aun, aparecen pills de acceso rapido con los productos frecuentes",
          "Cuando ya hay productos, los accesos rapidos aparecen como pills pequenas debajo de la lista",
        ],
      },
      {
        title: "Ajustar cantidades",
        content: "Cada producto tiene un stepper (+/−) para modificar las unidades planificadas.",
        steps: [
          "Pulsa + para aumentar la cantidad planificada",
          "Pulsa − para reducir. Si llega a 0, el producto se elimina del plan",
          "El numero central muestra la cantidad actual con animacion",
          "Si el producto tiene pedidos, veras el texto X en pedidos debajo del nombre",
        ],
        tip: "Junto al stepper aparece un badge de excedente cuando hay pedidos para ese producto",
      },
      {
        title: "Interpretar los badges de excedente",
        content: "Cada producto con pedidos muestra un badge de color junto al stepper que indica la diferencia entre lo planificado y lo reservado.",
        steps: [
          "Badge verde (+N) — sobran N unidades para venta directa",
          "Badge rojo (−N) — faltan N unidades para cubrir los pedidos",
          "Badge gris (0) — la produccion cubre exactamente los pedidos, sin excedente",
        ],
        tip: "Ejemplo: si planificas 6 brownies y hay 3 en pedidos, el badge mostrara +3 en verde (3 disponibles para venta)",
      },
      {
        title: "Resumen con el desplegable cerrado",
        content: "Al cerrar el desplegable, el header muestra un resumen compacto con los totales del plan.",
        steps: [
          "El subtitulo del header muestra: X plan · Y pedidos · Z disp.",
          "Debajo del header se despliega la lista de productos con Plan, Pedidos y badge de excedente",
          "Pulsa en cualquier parte del header para volver a abrir y editar",
        ],
      },
      {
        title: "Persistencia de datos",
        content: "Los datos del plan se guardan automaticamente en tu navegador (localStorage) para cada dia.",
        steps: [
          "Cada dia tiene su propio plan independiente",
          "Los datos se mantienen al recargar la pagina o cerrar el navegador",
          "Los planes de mas de 7 dias se eliminan automaticamente para no acumular datos",
          "Al cambiar de fecha en el selector, se carga el plan correspondiente a ese dia",
        ],
        tip: "Los datos solo se guardan en tu navegador, no en Notion. Si cambias de dispositivo o borras datos del navegador, los planes se pierden",
      },
    ],
  },
  {
    id: "seguimiento", title: "Seguimiento", icon: <I.Phone s={20} />,
    sections: [
      {
        title: "Pagina publica para clientes",
        content: "Los clientes pueden consultar el estado de sus pedidos en la pagina de seguimiento.",
        steps: ["El cliente introduce su numero de telefono", "Se muestran sus pedidos con estado, fecha y productos", "La pagina es accesible en vynia-mngmnt.vercel.app/seguimiento"],
        tip: "No requiere login ni contrasena — solo el numero de telefono",
      },
      {
        title: "Incrustar en WordPress",
        content: "La pagina de seguimiento puede incrustarse en tu web de WordPress como iframe.",
        tip: "En modo iframe se ocultan automaticamente el logo y el fondo para integrarse con tu web",
      },
    ],
  },
  {
    id: "general", title: "General", icon: <I.Gear s={20} />,
    sections: [
      {
        title: "Modo Live vs Demo",
        content: "El boton LIVE/DEMO en la cabecera alterna entre datos reales y datos de prueba.",
        steps: ["LIVE — conectado a Notion (datos reales)", "DEMO — datos de ejemplo sin conexion"],
        tip: "El modo Demo se activa automaticamente si no hay conexion con la API",
      },
      {
        title: "Sincronizacion y recarga",
        content: "La app se sincroniza con Notion de varias formas.",
        steps: ["Automaticamente al volver a la pestaña del navegador", "Cada 60 segundos mientras la pestaña esta activa", "Manualmente con el boton de recarga en la cabecera"],
      },
      {
        title: "Version y changelog",
        content: "Pulsa el numero de version bajo el logo para ver las notas de la ultima actualizacion.",
      },
      {
        title: "Tooltips (ayuda rapida)",
        content: "Todos los botones tienen textos de ayuda.",
        steps: ["En escritorio: pasa el cursor por encima", "En movil: manten pulsado ~0.4 segundos"],
        tip: "El tooltip desaparece solo tras 1.5 segundos en movil",
      },
      {
        title: "Banner de actualizacion",
        content: "Cuando hay una nueva version desplegada, aparece un banner en la parte inferior.",
        steps: ["Pulsa Actualizar para recargar con la ultima version"],
      },
    ],
  },
];

// ─── DATE HELPERS ───
const fmt = {
  date: (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  },
  time: (iso) => {
    if (!iso || !iso.includes("T")) return "";
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  },
  dateShort: (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  },
  localISO: (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
  isToday: (iso) => {
    if (!iso) return false;
    return iso.startsWith(fmt.localISO());
  },
  isTomorrow: (iso) => {
    if (!iso) return false;
    const t = new Date(); t.setDate(t.getDate() + 1);
    return iso.startsWith(fmt.localISO(t));
  },
  isPast: (iso) => {
    if (!iso) return false;
    return new Date(iso) < new Date(fmt.localISO());
  },
  todayISO: () => fmt.localISO(),
  tomorrowISO: () => { const t = new Date(); t.setDate(t.getDate() + 1); return fmt.localISO(t); },
  dayAfterISO: () => { const t = new Date(); t.setDate(t.getDate() + 2); return fmt.localISO(t); },
};

// ─── MAÑANA / TARDE DETECTION ───
function esTarde(p) {
  const notas = (p.notas || "").toLowerCase();
  if (notas.includes("tarde")) return true;
  const horaMatch = notas.match(/\b(\d{1,2})[:\s]?[h0-9]*/);
  if (horaMatch && parseInt(horaMatch[1], 10) >= 17) return true;
  const hora = p.hora || fmt.time(p.fecha);
  if (hora && parseInt(hora.split(":")[0], 10) >= 17) return true;
  return false;
}

// ─── DATE SUGGESTIONS (scoring for delivery date optimization) ───
function computeDateSuggestions(produccionRango, lineas) {
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

// ─── SURPLUS (localStorage helpers for planned production) ───
const SURPLUS_KEY = "vynia-surplus:";

function loadSurplusPlan(fecha) {
  try { return JSON.parse(localStorage.getItem(SURPLUS_KEY + fecha) || "{}"); }
  catch { return {}; }
}

function saveSurplusPlan(fecha, plan) {
  const clean = Object.fromEntries(Object.entries(plan).filter(([, v]) => v > 0));
  if (Object.keys(clean).length) {
    localStorage.setItem(SURPLUS_KEY + fecha, JSON.stringify(clean));
  } else {
    localStorage.removeItem(SURPLUS_KEY + fecha);
  }
}

function cleanOldSurplus() {
  const cutoff = Date.now() - 7 * 86400000;
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(SURPLUS_KEY) && new Date(k.slice(SURPLUS_KEY.length)) < cutoff)
      localStorage.removeItem(k);
  }
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

// ─── RESPONSIVE BREAKPOINTS ───
function useBreakpoint() {
  const get = () => {
    const w = window.innerWidth;
    if (w >= 1024) return "desktop";
    if (w >= 768) return "tablet";
    return "mobile";
  };
  const [bp, setBp] = useState(get);
  useEffect(() => {
    let timer;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(() => setBp(get()), 80); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return bp;
}

// ─── ESTADO GAUGE (half-circle SVG) ───
function EstadoGauge({ estado, size = 44 }) {
  const cfg = ESTADOS[estado] || ESTADOS["Sin empezar"];
  const progress = ESTADO_PROGRESS[estado] ?? 0;
  const h = Math.round(size * 0.6);
  const r = Math.round(size * 0.36);
  const cx = size / 2;
  const cy = h - 2;
  const semi = Math.PI * r;
  const offset = semi * (1 - progress);
  return (
    <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`} style={{ flexShrink: 0 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={cfg.bg} strokeWidth="4" strokeLinecap="round" />
      {progress > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={cfg.color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={semi} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.65, 0, 0.35, 1)" }} />
      )}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════
export default function VyniaApp() {
  // ─── RESPONSIVE ───
  const bp = useBreakpoint();
  const isDesktop = bp === "desktop";
  const isTablet = bp === "tablet";

  // ─── STATE ───
  const [tab, setTab] = useState("pedidos");   // pedidos | nuevo | produccion
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);     // { type: "ok"|"err", msg }
  const [apiMode, setApiMode] = useState("live"); // demo | live
  const [catalogo, setCatalogo] = useState(CATALOGO_FALLBACK);
  const [tooltip, setTooltip] = useState(null); // { text, x, y }

  // ─── GLOBAL TOOLTIP (long-press on mobile, JS hover on desktop) ───
  useEffect(() => {
    let timer = null;
    let hoverEl = null;

    const show = (text, rect) => {
      const x = Math.max(70, Math.min(rect.left + rect.width / 2, window.innerWidth - 70));
      const spaceAbove = rect.top;
      const flip = spaceAbove < 44;
      const y = flip ? rect.bottom + 6 : rect.top - 4;
      setTooltip({ text, x, y, flip });
    };
    const hide = () => setTooltip(null);

    // Mobile: long-press to show tooltip
    const onTouchStart = (e) => {
      const btn = e.target.closest("[title]");
      if (!btn) return;
      const text = btn.getAttribute("title");
      if (!text) return;
      const rect = btn.getBoundingClientRect();
      timer = setTimeout(() => show(text, rect), 400);
    };
    const onTouchEnd = () => { clearTimeout(timer); setTimeout(hide, 1500); };
    const onScroll = () => { clearTimeout(timer); hide(); };

    // Desktop: show JS tooltip on hover (replaces CSS ::after)
    const onMouseOver = (e) => {
      const el = e.target.closest("[title]");
      if (!el || el === hoverEl) return;
      if (hoverEl) {
        const prev = hoverEl.getAttribute("data-tip");
        if (prev) { hoverEl.setAttribute("title", prev); hoverEl.removeAttribute("data-tip"); }
      }
      hoverEl = el;
      const text = el.getAttribute("title");
      if (!text) return;
      el.setAttribute("data-tip", text);
      el.removeAttribute("title");
      const rect = el.getBoundingClientRect();
      show(text, rect);
    };
    const onMouseOut = (e) => {
      if (!hoverEl) return;
      if (hoverEl.contains(e.relatedTarget)) return;
      const t = hoverEl.getAttribute("data-tip");
      if (t) { hoverEl.setAttribute("title", t); hoverEl.removeAttribute("data-tip"); }
      hoverEl = null;
      hide();
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mouseout", onMouseOut, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      document.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      clearTimeout(timer);
    };
  }, []);

  // Pedidos data
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState("pendientes"); // pendientes | hoy | todos | recogidos
  const [filtroFecha, setFiltroFecha] = useState(fmt.todayISO()); // null = all dates
  const [renderLimit, setRenderLimit] = useState(30);
  const sentinelRef = useRef(null);
  const [mostrarPrecios, setMostrarPrecios] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpExpanded, setHelpExpanded] = useState(new Set());
  const [helpActiveCategory, setHelpActiveCategory] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [searchResults, setSearchResults] = useState([]); // clientes found
  const [fichaCliente, setFichaCliente] = useState(null); // selected client card
  const [fichaClientePedidos, setFichaClientePedidos] = useState([]);
  const [fichaClienteLoading, setFichaClienteLoading] = useState(false);
  const [editingClienteData, setEditingClienteData] = useState(null);
  const [savingCliente, setSavingCliente] = useState(false);
  const [pedidoFromFicha, setPedidoFromFicha] = useState(false);
  const busquedaTimer = useRef(null);
  const clienteWrapperRef = useRef(null);

  // Nuevo pedido form
  const [nuevoPaso, setNuevoPaso] = useState(1);
  const [cliente, setCliente] = useState("");
  const [clienteSuggestions, setClienteSuggestions] = useState([]);
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [telefono, setTelefono] = useState("");
  const [fecha, setFecha] = useState(fmt.todayISO());
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");
  const [pagado, setPagado] = useState(false);
  const [lineas, setLineas] = useState([]);
  const [searchProd, setSearchProd] = useState("");
  const [showCatFull, setShowCatFull] = useState(false);
  const [dateSuggestions, setDateSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [createResult, setCreateResult] = useState(null); // { status: "ok"|"err", cliente?, total?, pedidoId?, message? }
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseText, setParseText] = useState("");
  const [parseImage, setParseImage] = useState(null); // { dataUrl, fileName }
  const [parseLoading, setParseLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [listenText, setListenText] = useState(""); // live transcript shown in popup
  const [listenError, setListenError] = useState(""); // error shown inside listening popup
  const parseFileRef = useRef(null);
  const speechRecRef = useRef(null);
  const isListeningRef = useRef(false); // ref mirror of isListening for closures

  // Produccion diaria
  const [produccionData, setProduccionData] = useState([]);
  const [produccionFecha, setProduccionFecha] = useState(fmt.todayISO());
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [expandAll, setExpandAll] = useState(false);
  const [ocultarRecogidos, setOcultarRecogidos] = useState(true);
  const [surplusPlan, setSurplusPlan] = useState({});
  const [surplusSearch, setSurplusSearch] = useState("");
  const [surplusEditing, setSurplusEditing] = useState(false);
  const [surplusInfoOpen, setSurplusInfoOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [phoneMenu, setPhoneMenu] = useState(null); // { tel, x, y }
  const [confirmCancel, setConfirmCancel] = useState(null); // pedidoId
  const [whatsappPrompt, setWhatsappPrompt] = useState(null); // { tel, nombre }
  const [editingFecha, setEditingFecha] = useState(null); // { pedidoId, newFecha }
  const [editingNotas, setEditingNotas] = useState(null); // { pedidoId, newNotas }
  const [editingProductos, setEditingProductos] = useState(false);
  const [editLineas, setEditLineas] = useState([]); // [{ nombre, cantidad, precio, cat }]
  const [editSearchProd, setEditSearchProd] = useState("");

  // Bulk selection
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Refs
  const toastTimer = useRef(null);
  const searchRef = useRef(null);
  const clienteSearchTimer = useRef(null);
  const pendingViewPedidoId = useRef(null);

  // ─── TOAST ───
  const notify = useCallback((type, msg) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── SEARCH (searches Clientes DB by name, phone, email) ───
  const onBusquedaChange = (val) => {
    setBusqueda(val);
    if (busquedaTimer.current) clearTimeout(busquedaTimer.current);
    if (!val.trim() || val.trim().length < 2) { setSearchResults([]); setFichaCliente(null); return; }
    setFichaCliente(null);
    busquedaTimer.current = setTimeout(async () => {
      if (apiMode === "demo") return;
      try {
        const results = await notion.searchClientes(val.trim());
        setSearchResults(Array.isArray(results) ? results : []);
      } catch { setSearchResults([]); }
    }, 300);
  };

  const openFichaCliente = async (cliente) => {
    setFichaCliente(cliente);
    setSearchResults([]);
    setBusqueda(cliente.nombre);
    setFichaClienteLoading(true);
    try {
      const data = await notion.loadPedidosByCliente(cliente.id);
      const mapped = (Array.isArray(data) ? data : []).map(p => ({
        id: p.id, nombre: p.titulo || "", fecha: p.fecha || "",
        estado: effectiveEstado({ estado: p.estado, recogido: !!p.recogido, noAcude: !!p.noAcude, incidencia: !!p.incidencia }),
        pagado: !!p.pagado, notas: p.notas || "",
        tel: p.telefono || "", numPedido: p.numPedido || 0,
        hora: p.fecha?.includes("T") ? p.fecha.split("T")[1]?.substring(0, 5) : "",
        cliente: p.cliente || cliente.nombre, clienteId: p.clienteId || cliente.id,
      }));
      setFichaClientePedidos(mapped);
    } catch { setFichaClientePedidos([]); }
    setFichaClienteLoading(false);
  };

  const closeFicha = () => {
    setFichaCliente(null);
    setFichaClientePedidos([]);
    setEditingClienteData(null);
    setBusqueda("");
    setSearchResults([]);
  };

  const saveClienteData = async () => {
    if (!editingClienteData || !fichaCliente) return;
    setSavingCliente(true);
    try {
      await notion.updateCliente(fichaCliente.id, editingClienteData);
      const updated = { ...fichaCliente, ...editingClienteData };
      setFichaCliente(updated);
      setBusqueda(updated.nombre);
      setEditingClienteData(null);
      invalidateApiCache();
      notify("ok", "Cliente actualizado");
    } catch {
      notify("err", "Error al guardar cliente");
    }
    setSavingCliente(false);
  };

  // Invalidate caches when data changes
  const invalidateSearchCache = () => { invalidatePedidosCache(); };
  const invalidateProduccion = (pedidoFecha) => {
    // Only invalidate if the pedido's date matches the currently loaded produccion date
    const pedidoDate = (pedidoFecha || "").split("T")[0];
    if (!pedidoDate || pedidoDate === produccionFecha) setProduccionData([]);
  };

  // ─── LOAD PEDIDOS ───
  // skipEnrich: when true, skips the registros enrichment phase and preserves
  // existing productos/importe from previous state (used by auto-polls to save invocations)
  const loadPedidos = useCallback(async (fechaParam, { skipEnrich = false } = {}) => {
    const f = fechaParam !== undefined ? fechaParam : filtroFecha;
    if (apiMode === "demo") {
      const allDemo = [
        { id: "demo-1", nombre: "Pedido María García", cliente: "María García", tel: "600123456", fecha: fmt.todayISO(), hora: "10:30", productos: "2x Cookie pistacho, 1x Brownie", importe: 8.60, estado: "En preparación", pagado: true, notas: "" },
        { id: "demo-2", nombre: "Pedido Juan López", cliente: "Juan López", tel: "612345678", fecha: fmt.todayISO(), hora: "12:00", productos: "1x Hogaza Miel, 3x Viñacaos", importe: 18.50, estado: "Sin empezar", pagado: false, notas: "Sin nueces" },
        { id: "demo-3", nombre: "Pedido Ana Ruiz", cliente: "Ana Ruiz", tel: "654321000", fecha: fmt.tomorrowISO(), hora: "", productos: "1x Tarta de queso, 2x Barra de pan", importe: 32.00, estado: "Listo para recoger", pagado: true, notas: "Recoger por la tarde" },
        { id: "demo-4", nombre: "Pedido Carlos", cliente: "Carlos Martín", tel: "677888999", fecha: fmt.todayISO(), hora: "09:00", productos: "4x Magdalenas, 2x Bollitos", importe: 9.60, estado: "Recogido", pagado: true, notas: "" },
        { id: "demo-5", nombre: "Pedido Laura", cliente: "Laura Sánchez", tel: "611222333", fecha: fmt.dayAfterISO(), hora: "11:00", productos: "1x Bizcocho naranja, 1x Granola", importe: 8.80, estado: "Incidencia", pagado: false, notas: "Llamar antes" },
      ];
      setPedidos(f ? allDemo.filter(p => (p.fecha || "").startsWith(f)) : allDemo);
      return;
    }

    setLoading(true);
    try {
      const pedidosData = await notion.loadPedidosByDate(f);

      const mapped = (Array.isArray(pedidosData) ? pedidosData : []).map(p => {
        const raw = { estado: p.estado, recogido: !!p.recogido, noAcude: !!p.noAcude, incidencia: !!p.incidencia };
        return {
          id: p.id,
          nombre: p.titulo || "",
          fecha: p.fecha || "",
          estado: effectiveEstado(raw),
          pagado: !!p.pagado,
          notas: p.notas || "",
          importe: p.importe || 0,
          productos: p.productos || "",
          tel: p.telefono || "",
          numPedido: p.numPedido || 0,
          hora: p.fecha?.includes("T") ? p.fecha.split("T")[1]?.substring(0, 5) : "",
          cliente: p.cliente || (p.titulo || "").replace(/^Pedido\s+/i, ""),
          clienteId: p.clienteId || null,
        };
      });

      if (skipEnrich) {
        // Preserve enrichment data (productos, importe) from previous state
        setPedidos(prev => {
          const prevMap = {};
          for (const p of prev) { prevMap[p.id] = p; }
          return mapped.map(p => {
            const existing = prevMap[p.id];
            if (existing && (existing.productos || existing.importe)) {
              return { ...p, productos: existing.productos, importe: existing.importe };
            }
            return p;
          });
        });
        return;
      }

      setPedidos(mapped);
      notify("ok", `${mapped.length} pedido${mapped.length !== 1 ? "s" : ""} cargado${mapped.length !== 1 ? "s" : ""}`);
      // Enrich pedidos with importe in background (single setState after all batches)
      // Cap at 50 pedidos to avoid hundreds of API calls when loading "Todos"
      const MAX_ENRICH = 50;
      const toEnrich = mapped.slice(0, MAX_ENRICH);
      if (toEnrich.length > 0) {
        (async () => {
          const allUpdates = {};
          for (let i = 0; i < toEnrich.length; i += 5) {
            await Promise.all(toEnrich.slice(i, i + 5).map(async (ped) => {
              try {
                const prods = await notion.loadRegistros(ped.id);
                if (!Array.isArray(prods)) return;
                const imp = prods.reduce((s, pr) => s + (pr.unidades || 0) * (PRICE_MAP[(pr.nombre || "").toLowerCase().trim()] || 0), 0);
                const str = prods.map(pr => `${pr.unidades}x ${pr.nombre}`).join(", ");
                allUpdates[ped.id] = { importe: imp, productos: str };
              } catch { /* ignore */ }
            }));
          }
          setPedidos(ps => ps.map(p => allUpdates[p.id] ? { ...p, ...allUpdates[p.id] } : p));
        })();
      }
    } catch (err) {
      notify("err", "Error cargando: " + (err.message || "desconocido").substring(0, 100));
    } finally {
      setLoading(false);
    }
  }, [apiMode, filtroFecha, notify]);

  useEffect(() => { loadPedidos(); loadProduccion(); }, [apiMode]);

  // ─── Auto-refresh: reload on tab focus (debounced) + poll every 120s ───
  // Polls use skipEnrich to avoid re-fetching registros (preserves existing data).
  // Manual reloads and initial load still do full enrichment.
  useEffect(() => {
    if (apiMode === "demo") return;
    const reload = () => { invalidateApiCache(); loadPedidos(undefined, { skipEnrich: true }); if (tab === "produccion") loadProduccion(); };
    let visDebounce = null;
    const onVisible = () => {
      if (!document.hidden) {
        clearTimeout(visDebounce);
        visDebounce = setTimeout(reload, 2000);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => { if (!document.hidden) reload(); }, 120000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(interval); clearTimeout(visDebounce); };
  }, [apiMode, tab, loadPedidos]);

  // ─── Version check: notify user when a new deploy is available ───
  useEffect(() => {
    const check = () => {
      fetch("/version.json?t=" + Date.now()).then(r => r.json()).then(d => {
        if (d.version && d.version !== __APP_VERSION__) setUpdateAvailable(true);
      }).catch(() => { });
    };
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(check, 120000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(interval); };
  }, []);

  // ─── Surplus: cleanup old plans on mount ───
  useEffect(() => { cleanOldSurplus(); }, []);

  // ─── Surplus: load plan when production date changes ───
  useEffect(() => {
    setSurplusPlan(loadSurplusPlan(produccionFecha));
    setSurplusSearch("");
    setSurplusInfoOpen(false);
  }, [produccionFecha]);

  // ─── Load product catalog from Notion (source of truth) ───
  useEffect(() => {
    if (apiMode === "demo") { setCatalogo(CATALOGO_FALLBACK); return; }
    notion.loadProductos()
      .then(prods => {
        if (Array.isArray(prods) && prods.length > 0) {
          setCatalogo(prods);
          PRICE_MAP = {};
          prods.forEach(c => { PRICE_MAP[c.nombre.toLowerCase().trim()] = c.precio; });
        }
      })
      .catch(() => { /* fallback silently */ });
  }, [apiMode]);

  // ─── Close dropdowns on click outside ───
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clienteWrapperRef.current && !clienteWrapperRef.current.contains(e.target)) {
        setClienteSuggestions([]);
        setSearchResults([]);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── LOAD PRODUCTS FOR SELECTED PEDIDO ───
  useEffect(() => {
    if (!selectedPedido || apiMode === "demo") return;
    const hasIds = Array.isArray(selectedPedido.productos) && selectedPedido.productos.length > 0 && selectedPedido.productos[0]?.id;
    if (hasIds) return;
    let cancelled = false;
    (async () => {
      try {
        const prods = await notion.loadRegistros(selectedPedido.id);
        if (!cancelled && Array.isArray(prods) && prods.length > 0) {
          setSelectedPedido(prev => prev && prev.id === selectedPedido.id ? { ...prev, productos: prods } : prev);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [selectedPedido?.id]);

  // ─── LOAD PRODUCCION ───
  const loadProduccion = useCallback(async (fechaParam) => {
    const f = fechaParam || produccionFecha;
    if (apiMode === "demo") {
      // Parse demo pedidos to generate produccion data
      const demoPedidos = [
        { id: "demo-1", nombre: "Pedido María García", cliente: "María García", tel: "600123456", fecha: fmt.todayISO(), hora: "10:30", productos: "2x Cookie pistacho, 1x Brownie", importe: 8.60, estado: "En preparación", pagado: true, notas: "" },
        { id: "demo-2", nombre: "Pedido Juan López", cliente: "Juan López", tel: "612345678", fecha: fmt.todayISO(), hora: "12:00", productos: "1x Hogaza Miel, 3x Viñacaos", importe: 18.50, estado: "Sin empezar", pagado: false, notas: "Sin nueces" },
        { id: "demo-4", nombre: "Pedido Carlos", cliente: "Carlos Martín", tel: "677888999", fecha: fmt.todayISO(), hora: "09:00", productos: "4x Magdalenas, 2x Bollitos", importe: 9.60, estado: "Listo para recoger", pagado: true, notas: "" },
        { id: "demo-5", nombre: "Pedido Ana Ruiz", cliente: "Ana Ruiz", tel: "655111222", fecha: fmt.todayISO(), hora: "09:30", productos: "3x Cookie pistacho, 2x Magdalenas", importe: 11.00, estado: "Recogido", pagado: true, notas: "" },
      ];
      const filtered = demoPedidos.filter(p => (p.fecha || "").startsWith(f) && p.estado !== "No acude");
      const agg = {};
      filtered.forEach(p => {
        (p.productos || "").split(",").forEach(item => {
          const m = item.trim().match(/^(\d+)x\s+(.+)$/);
          if (!m) return;
          const qty = parseInt(m[1], 10);
          const name = m[2].trim();
          if (!agg[name]) agg[name] = { nombre: name, totalUnidades: 0, pedidos: [] };
          agg[name].totalUnidades += qty;
          agg[name].pedidos.push({ pedidoId: p.id, pedidoTitulo: p.nombre, unidades: qty, fecha: p.fecha, estado: p.estado, pagado: p.pagado, notas: p.notas, cliente: p.cliente, tel: p.tel, hora: p.hora });
        });
      });
      setProduccionData(Object.values(agg).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      return;
    }
    setLoading(true);
    try {
      const data = await notion.loadProduccion(f);
      setProduccionData(data.productos || []);
    } catch (err) {
      notify("err", "Error cargando producción: " + (err.message || "").substring(0, 100));
    } finally {
      setLoading(false);
    }
  }, [apiMode, produccionFecha, notify]);

  // ─── CAMBIAR ESTADO ───
  const [estadoPicker, setEstadoPicker] = useState(null);
  const [pendingEstadoChange, setPendingEstadoChange] = useState(null); // { pedido, nuevoEstado, isBulk }
  const [pendingPagadoChange, setPendingPagadoChange] = useState(null); // { pedido }

  const requestEstadoChange = (pedido, nuevoEstado, opts = {}) => {
    setPendingEstadoChange({ pedido, nuevoEstado, ...opts });
    if (!opts.keepPicker) setEstadoPicker(null);
  };

  const confirmarCambioEstado = () => {
    if (!pendingEstadoChange) return;
    const { pedido, nuevoEstado, isBulk } = pendingEstadoChange;
    setPendingEstadoChange(null);
    if (isBulk) {
      cambiarEstadoBulk(nuevoEstado);
    } else {
      cambiarEstado(pedido, nuevoEstado);
      if (selectedPedido && selectedPedido.id === pedido.id) {
        setSelectedPedido(prev => prev ? { ...prev, estado: nuevoEstado } : prev);
      }
    }
  };

  const cambiarEstado = async (pedido, nuevoEstado) => {
    if (apiMode === "demo") {
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, estado: nuevoEstado } : p));
      notify("ok", ESTADOS[nuevoEstado]?.label || nuevoEstado);
      if (nuevoEstado === "Listo para recoger" && (pedido.telefono || pedido.tel)) {
        setWhatsappPrompt({ tel: pedido.telefono || pedido.tel, nombre: pedido.cliente || pedido.titulo || pedido.nombre });
      }
      return;
    }
    setLoading(true);
    try {
      await notion.cambiarEstado(pedido.id, nuevoEstado);
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, estado: nuevoEstado } : p));
      invalidateProduccion(pedido.fecha); invalidateSearchCache();
      notify("ok", `${ESTADOS[nuevoEstado]?.icon || ""} ${ESTADOS[nuevoEstado]?.label || nuevoEstado}`);
      if (nuevoEstado === "Listo para recoger" && (pedido.telefono || pedido.tel)) {
        setWhatsappPrompt({ tel: pedido.telefono || pedido.tel, nombre: pedido.cliente || pedido.titulo || pedido.nombre });
      }
    } catch (err) {
      notify("err", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── BULK ESTADO CHANGE ───
  const cambiarEstadoBulk = async (nuevoEstado) => {
    const selected = pedidos.filter(p => bulkSelected.has(p.id));
    if (selected.length === 0) return;
    setBulkLoading(true);
    const prevEstados = new Map(selected.map(p => [p.id, p.estado]));
    // Optimistic UI
    setPedidos(ps => ps.map(p => bulkSelected.has(p.id) ? { ...p, estado: nuevoEstado } : p));

    let failCount = 0;
    if (apiMode !== "demo") {
      const results = await Promise.allSettled(
        selected.map(p => notion.cambiarEstado(p.id, nuevoEstado))
      );
      const failedIds = new Set();
      results.forEach((r, i) => { if (r.status === "rejected") failedIds.add(selected[i].id); });
      failCount = failedIds.size;
      if (failCount > 0) {
        // Rollback failed pedidos to their previous estado
        setPedidos(ps => ps.map(p => failedIds.has(p.id) ? { ...p, estado: prevEstados.get(p.id) } : p));
        notify("err", `${failCount} pedido${failCount > 1 ? "s" : ""} fallaron`);
      }
      invalidateProduccion(); invalidateSearchCache();
    }

    if (failCount === 0) notify("ok", `${selected.length} pedidos → ${ESTADOS[nuevoEstado]?.label || nuevoEstado}`);
    setBulkMode(false);
    setBulkSelected(new Set());
    setBulkLoading(false);
  };

  // ─── CANCEL PEDIDO ───
  const cancelarPedido = async (pedido) => {
    if (apiMode === "demo") {
      setPedidos(ps => ps.filter(p => p.id !== pedido.id));
      setSelectedPedido(null);
      setConfirmCancel(null);
      notify("ok", "Pedido cancelado");
      return;
    }
    setLoading(true);
    try {
      await notion.archivarPedido(pedido.id);
      setPedidos(ps => ps.filter(p => p.id !== pedido.id));
      invalidateProduccion(pedido.fecha); invalidateSearchCache();
      setSelectedPedido(null);
      setConfirmCancel(null);
      notify("ok", "Pedido cancelado");
    } catch (err) {
      notify("err", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── CLEANUP ORPHAN REGISTROS ───
  const cleanupOrphanRegistros = async () => {
    if (apiMode === "demo") { notify("err", "No disponible en modo demo"); return; }
    notify("ok", "Buscando registros huérfanos...");
    try {
      const { orphanIds = [], count = 0 } = await notion.findOrphanRegistros();
      if (count === 0) { notify("ok", "No hay registros huérfanos"); return; }
      notify("ok", `${count} huérfanos encontrados. Archivando...`);
      for (let i = 0; i < orphanIds.length; i += 10) {
        await notion.deleteRegistros(orphanIds.slice(i, i + 10));
        notify("ok", `Archivando... ${Math.min(i + 10, count)}/${count}`);
      }
      invalidateApiCache();
      notify("ok", `Limpieza completada: ${count} registros archivados`);
    } catch (err) {
      notify("err", "Error limpieza: " + (err.message || "").substring(0, 100));
    }
  };

  // ─── CHANGE DELIVERY DATE ───
  const cambiarFechaPedido = async (pedido, newFecha) => {
    if (!newFecha) return;
    if (apiMode === "demo") {
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, fecha: newFecha, hora: "" } : p));
      setEditingFecha(null);
      notify("ok", "Fecha actualizada");
      return;
    }
    setLoading(true);
    try {
      await notion.updatePage(pedido.id, { "Fecha entrega": { date: { start: newFecha } } });
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, fecha: newFecha, hora: "" } : p));
      invalidateProduccion(pedido.fecha); invalidateProduccion(newFecha); invalidateSearchCache();
      setEditingFecha(null);
      notify("ok", "Fecha actualizada");
    } catch (err) {
      notify("err", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── MODIFY NOTAS ───
  const cambiarNotas = async (pedido, newNotas) => {
    const trimmed = (newNotas || "").trim();
    if (apiMode === "demo") {
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, notas: trimmed } : p));
      if (selectedPedido?.id === pedido.id) setSelectedPedido(prev => prev ? { ...prev, notas: trimmed } : prev);
      setEditingNotas(null);
      notify("ok", trimmed ? "Notas actualizadas" : "Notas eliminadas");
      return;
    }
    setLoading(true);
    try {
      await notion.updatePage(pedido.id, {
        "Notas": { rich_text: trimmed ? [{ type: "text", text: { content: trimmed } }] : [] }
      });
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, notas: trimmed } : p));
      if (selectedPedido?.id === pedido.id) setSelectedPedido(prev => prev ? { ...prev, notas: trimmed } : prev);
      invalidateSearchCache();
      setEditingNotas(null);
      notify("ok", trimmed ? "Notas actualizadas" : "Notas eliminadas");
    } catch (err) {
      notify("err", err.message);
    } finally {
      setLoading(false);
    }
  };

  const requestPagadoChange = (pedido) => {
    setPendingPagadoChange({ pedido });
  };

  const confirmarPagadoChange = async () => {
    if (!pendingPagadoChange) return;
    const { pedido } = pendingPagadoChange;
    setPendingPagadoChange(null);
    const newVal = !pedido.pagado;
    const updateLocal = () => {
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, pagado: newVal } : p));
      if (selectedPedido?.id === pedido.id) setSelectedPedido(prev => prev ? { ...prev, pagado: newVal } : prev);
      setProduccionData(prev => prev.map(prod => ({
        ...prod,
        pedidos: prod.pedidos.map(ped => ped.pedidoId === pedido.id ? { ...ped, pagado: newVal } : ped),
      })));
    };
    if (apiMode === "demo") {
      updateLocal();
      notify("ok", newVal ? "Marcado como pagado" : "Desmarcado como pagado");
      return;
    }
    // Optimistic UI — instant feedback, rollback on failure
    updateLocal();
    try {
      await notion.updatePage(pedido.id, {
        "Pagado al reservar": { checkbox: newVal }
      });
      invalidateSearchCache();
      notify("ok", newVal ? "Marcado como pagado" : "Desmarcado como pagado");
    } catch (err) {
      // Rollback
      const rollback = () => {
        setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, pagado: !newVal } : p));
        if (selectedPedido?.id === pedido.id) setSelectedPedido(prev => prev ? { ...prev, pagado: !newVal } : prev);
        setProduccionData(prev => prev.map(prod => ({
          ...prod,
          pedidos: prod.pedidos.map(ped => ped.pedidoId === pedido.id ? { ...ped, pagado: !newVal } : ped),
        })));
      };
      rollback();
      notify("err", err.message);
    }
  };

  // ─── MODIFY PEDIDO PRODUCTS ───
  const addEditProducto = (prod) => {
    const existing = editLineas.find(l => l.nombre === prod.nombre);
    if (existing) {
      setEditLineas(editLineas.map(l => l.nombre === prod.nombre ? { ...l, cantidad: l.cantidad + 1 } : l));
    } else {
      setEditLineas([...editLineas, { nombre: prod.nombre, precio: prod.precio, cantidad: 1, cat: prod.cat }]);
    }
    setEditSearchProd("");
  };

  const updateEditQty = (nombre, delta) => {
    setEditLineas(ls => ls.map(l => l.nombre === nombre ? { ...l, cantidad: Math.max(0, l.cantidad + delta) } : l).filter(l => l.cantidad > 0));
  };

  const editProductosFiltrados = editSearchProd
    ? catalogo.filter(p => p.nombre.toLowerCase().includes(editSearchProd.toLowerCase()))
    : [];

  const guardarModificacion = async (pedido, newLineas) => {
    if (newLineas.length === 0) { notify("err", "Añade al menos un producto"); return; }
    const newImporte = newLineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
    const newProdsStr = newLineas.map(l => `${l.cantidad}x ${l.nombre}`).join(", ");
    if (apiMode === "demo") {
      const newProds = newLineas.map(l => ({ nombre: l.nombre, unidades: l.cantidad }));
      setSelectedPedido(prev => prev ? { ...prev, productos: newProds } : prev);
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, importe: newImporte, productos: newProdsStr } : p));
      setEditingProductos(false); setEditLineas([]); setEditSearchProd("");
      notify("ok", "Pedido modificado");
      return;
    }
    setLoading(true);
    try {
      // Create new registros FIRST, delete old AFTER (prevents data loss on partial failure)
      for (const linea of newLineas) {
        await notion.crearRegistro(pedido.id, linea.nombre, linea.cantidad);
      }
      let prods = pedido.productos || [];
      if (Array.isArray(prods) && prods.length > 0 && !prods[0]?.id) {
        prods = await notion.loadRegistros(pedido.id) || [];
      }
      const oldIds = prods.filter(p => p.id).map(p => p.id);
      if (oldIds.length > 0) {
        await notion.deleteRegistros(oldIds);
      }
      // Reload fresh registros (with new IDs)
      const freshProds = await notion.loadRegistros(pedido.id);
      setSelectedPedido(prev => prev ? { ...prev, productos: Array.isArray(freshProds) ? freshProds : [] } : prev);
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, importe: newImporte, productos: newProdsStr } : p));
      setEditingProductos(false); setEditLineas([]); setEditSearchProd("");
      invalidateProduccion(pedido.fecha); invalidateSearchCache();
      notify("ok", "Pedido modificado");
    } catch (err) {
      notify("err", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── PHONE MENU (call / WhatsApp) ───
  const openPhoneMenu = (tel, e) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setPhoneMenu({ tel, x: rect.left + rect.width / 2, y: rect.bottom + 4 });
  };
  const waLink = (tel) => {
    const clean = (tel || "").replace(/[\s\-().]/g, "");
    const num = clean.startsWith("+") ? clean.slice(1) : clean.startsWith("34") ? clean : `34${clean}`;
    return `https://wa.me/${num}`;
  };
  const parseProductsStr = (str) => {
    if (!str || typeof str !== "string") return [];
    return str.split(",").map(s => {
      const m = s.trim().match(/^(\d+)x\s+(.+)$/);
      return m ? { nombre: m[2].trim(), unidades: parseInt(m[1], 10) } : null;
    }).filter(Boolean);
  };

  // ─── CREATE ORDER ───
  const crearPedido = async () => {
    if (!cliente.trim() || !fecha || lineas.length === 0) {
      notify("err", "Falta: cliente, fecha o productos");
      return;
    }

    if (apiMode === "demo") {
      const total = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
      const prodsStr = lineas.map(l => `${l.cantidad}x ${l.nombre}`).join(", ");
      const demoId = `demo-${Date.now()}`;
      setPedidos(ps => [{
        id: demoId,
        nombre: `Pedido ${cliente}`,
        cliente,
        tel: telefono,
        fecha: hora ? `${fecha}T${hora}:00` : fecha,
        hora,
        productos: prodsStr,
        importe: total,
        estado: "Sin empezar",
        pagado,
        notas,
      }, ...ps]);
      notify("ok", `✓ Pedido creado: ${cliente} — €${total.toFixed(2)}`);
      setCreateResult({ status: "ok", cliente, total, pedidoId: demoId });
      resetForm();
      return;
    }

    setLoading(true);
    try {
      // 1. Find or create client (skip if already selected from autocomplete)
      let clientePageId = selectedClienteId;
      if (!clientePageId) {
        const clienteRes = await notion.findOrCreateCliente(cliente.trim(), telefono);
        if (!clienteRes?.id) throw new Error("No se pudo crear/encontrar el cliente");
        clientePageId = clienteRes.id;
      }

      // 2. Create order + line items (handled by api.js)
      const pedidoRes = await notion.crearPedido(
        cliente.trim(), clientePageId, fecha, hora, pagado, notas, lineas
      );

      const total = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
      notify("ok", `✓ Pedido creado en Notion: ${cliente} — €${total.toFixed(2)}`);
      const savedCliente = cliente.trim();
      setCreateResult({ status: "ok", cliente: savedCliente, total, pedidoId: pedidoRes.id, telefono, fecha, hora, pagado, notas, lineas });
      resetForm();
      loadPedidos();
      invalidateProduccion(fecha); invalidateSearchCache();
    } catch (err) {
      notify("err", "Error: " + (err.message || "").substring(0, 100));
      setCreateResult({ status: "err", message: err.message || "Error desconocido" });
    } finally {
      setLoading(false);
    }
  };

  const verPedidoCreado = (pedidoId) => {
    const cr = createResult;
    setCreateResult(null);
    setTab("pedidos");
    const found = pedidos.find(p => p.id === pedidoId);
    if (found) {
      setSelectedPedido({
        ...found,
        pedidoTitulo: found.nombre,
        tel: found.tel, telefono: found.tel,
        productos: typeof found.productos === "string"
          ? parseProductsStr(found.productos)
          : (Array.isArray(found.productos) ? found.productos : []),
      });
    } else if (cr) {
      const fechaFull = cr.hora ? `${cr.fecha}T${cr.hora}:00` : cr.fecha;
      setSelectedPedido({
        id: pedidoId,
        nombre: `Pedido ${cr.cliente}`,
        pedidoTitulo: `Pedido ${cr.cliente}`,
        cliente: cr.cliente,
        tel: cr.telefono || "", telefono: cr.telefono || "",
        fecha: fechaFull,
        hora: cr.hora || "",
        estado: "Sin empezar",
        pagado: !!cr.pagado,
        notas: cr.notas || "",
        productos: (cr.lineas || []).map(l => ({ nombre: l.nombre, unidades: l.cantidad })),
        importe: cr.total || 0,
        numPedido: 0,
      });
      pendingViewPedidoId.current = pedidoId;
    } else {
      pendingViewPedidoId.current = pedidoId;
    }
  };

  useEffect(() => {
    if (!pendingViewPedidoId.current) return;
    const found = pedidos.find(p => p.id === pendingViewPedidoId.current);
    if (found) {
      pendingViewPedidoId.current = null;
      setSelectedPedido({
        ...found,
        pedidoTitulo: found.nombre,
        tel: found.tel, telefono: found.tel,
        productos: typeof found.productos === "string"
          ? parseProductsStr(found.productos)
          : (Array.isArray(found.productos) ? found.productos : []),
      });
    }
  }, [pedidos]);

  const resetForm = () => {
    setNuevoPaso(1);
    setCliente(""); setTelefono(""); setFecha(fmt.todayISO());
    setHora(""); setNotas(""); setPagado(false); setLineas([]);
    setSearchProd(""); setShowCatFull(false);
    setClienteSuggestions([]); setSelectedClienteId(null);
    setDateSuggestions([]); setSuggestionsLoading(false);
  };

  // ─── CLIENT AUTOCOMPLETE ───
  const onClienteChange = (val) => {
    setCliente(val);
    setSelectedClienteId(null);
    if (clienteSearchTimer.current) clearTimeout(clienteSearchTimer.current);
    if (apiMode === "demo" || val.trim().length < 2) {
      setClienteSuggestions([]);
      return;
    }
    clienteSearchTimer.current = setTimeout(async () => {
      try {
        const results = await notion.searchClientes(val.trim());
        setClienteSuggestions(Array.isArray(results) ? results : []);
      } catch { setClienteSuggestions([]); }
    }, 300);
  };
  const selectCliente = (c) => {
    setCliente(c.nombre);
    setSelectedClienteId(c.id);
    if (c.telefono) setTelefono(c.telefono);
    setClienteSuggestions([]);
  };

  // ─── PARSE WHATSAPP ORDER ───
  const handleParseImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setParseImage({ dataUrl: e.target.result, fileName: file.name });
    reader.readAsDataURL(file);
  };
  const handleParsePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        handleParseImageFile(item.getAsFile());
        return;
      }
    }
  };
  const handleParseDrop = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "#E8E0D4";
    const file = e.dataTransfer?.files?.[0];
    if (file) handleParseImageFile(file);
  };
  const handleParseOrder = async () => {
    const hasText = parseText.trim().length >= 5;
    const hasImage = !!parseImage;
    if ((!hasText && !hasImage) || parseLoading) return;
    setParseLoading(true);
    setParseError(null);
    setParseResult(null);
    try {
      const result = await notion.parseWhatsApp(
        hasText ? parseText.trim() : null,
        null, null,
        hasImage ? parseImage.dataUrl : null
      );
      if (result?.ok) setParseResult(result);
      else setParseError(result?.error || "Error desconocido");
    } catch (err) {
      setParseError(err.message || "Error al analizar el mensaje");
    } finally {
      setParseLoading(false);
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    speechRecRef.current?.stop();
    setIsListening(false);
  };

  const toggleListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setParseError("Tu navegador no soporta dictado por voz. Usa Chrome.");
      return;
    }
    if (isListening) { stopListening(); return; }

    // Safari: webkitSpeechRecognition exists but doesn't work reliably
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      setParseError("Safari no soporta dictado de forma fiable. Abre la app en Chrome para usar esta funcion.");
      return;
    }

    setListenError("");
    setParseError(null);

    // SpeechRecognition handles its own mic access — no getUserMedia needed.
    // Chrome shows the native permission prompt on the first call to rec.start().
    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;
    speechRecRef.current = rec;
    let finalTranscript = parseText;
    let fatalError = false;
    setListenText(parseText);

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t;
        } else {
          interim += t;
        }
      }
      const full = finalTranscript + (interim ? " " + interim : "");
      setParseText(full);
      setListenText(full);
    };

    rec.onerror = (event) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") return;
      fatalError = true;
      let msg;
      if (event.error === "not-allowed") {
        msg = "Microfono bloqueado. Pulsa el candado en la barra de direcciones, permite el microfono y recarga la pagina.";
      } else if (event.error === "network") {
        msg = "Sin conexion al servicio de voz de Google. Comprueba tu conexion a internet.";
      } else if (event.error === "service-not-allowed") {
        msg = "El servicio de reconocimiento de voz no esta disponible. Usa Chrome y permite el reconocimiento de voz en Ajustes.";
      } else {
        msg = "Error de dictado: " + event.error;
      }
      setListenError(msg);
      setParseError(msg);
    };

    rec.onend = () => {
      if (isListeningRef.current && !fatalError) {
        try { rec.start(); } catch { stopListening(); }
      } else {
        stopListening();
      }
    };

    try {
      rec.start();
    } catch (err) {
      setParseError("No se pudo iniciar el dictado: " + err.message);
      return;
    }

    isListeningRef.current = true;
    setIsListening(true);
  };

  const aplicarParseo = (result) => {
    if (result.clienteId && result.clienteExiste) {
      // Client found by phone in DB — select directly
      setCliente(result.cliente || "");
      setSelectedClienteId(result.clienteId);
      setClienteSuggestions([]);
    } else if (result.cliente) {
      setCliente(result.cliente);
      setSelectedClienteId(null);
      // No match by phone — trigger autocomplete by name as fallback
      if (apiMode !== "demo" && result.cliente.trim().length >= 2) {
        clearTimeout(clienteSearchTimer.current);
        clienteSearchTimer.current = setTimeout(async () => {
          try {
            const results = await notion.searchClientes(result.cliente.trim());
            setClienteSuggestions(Array.isArray(results) ? results : []);
          } catch { setClienteSuggestions([]); }
        }, 100);
      }
    }
    if (result.telefono) setTelefono(result.telefono);
    if (result.fecha) setFecha(result.fecha);
    if (result.hora) setHora(result.hora);
    if (result.notas) setNotas(result.notas);
    if (result.pagado != null) setPagado(result.pagado);

    // Map matched products to lineas with precio/cat from catalogo
    const newLineas = (result.lineas || [])
      .filter(l => l.matched)
      .map(l => {
        const catItem = catalogo.find(c => c.nombre === l.nombre);
        return { nombre: l.nombre, cantidad: l.cantidad, precio: catItem?.precio || 0, cat: catItem?.cat || "" };
      });
    setLineas(newLineas);

    setShowParseModal(false);
    setCreateResult(null);
  };

  // ─── PRODUCT MANAGEMENT ───
  const addProducto = (prod) => {
    const existing = lineas.find(l => l.nombre === prod.nombre);
    if (existing) {
      setLineas(lineas.map(l => l.nombre === prod.nombre ? { ...l, cantidad: l.cantidad + 1 } : l));
    } else {
      setLineas([...lineas, { nombre: prod.nombre, precio: prod.precio, cantidad: 1, cat: prod.cat }]);
    }
    setSearchProd("");
    if (searchRef.current) searchRef.current.focus();
  };

  const updateQty = (nombre, delta) => {
    setLineas(ls => ls.map(l => l.nombre === nombre ? { ...l, cantidad: Math.max(0, l.cantidad + delta) } : l).filter(l => l.cantidad > 0));
  };

  const totalPedido = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
  const totalItems = lineas.reduce((s, l) => s + l.cantidad, 0);

  // ─── STATS (single-pass, memoized) ───
  const { statsTotal, statsPendientes, statsRecogidos } = useMemo(() => {
    let total = 0, pendientes = 0, recogidos = 0;
    for (const p of pedidos) {
      total++;
      const g = ESTADOS[p.estado]?.group;
      if (p.estado === "Recogido") recogidos++;
      else if (g !== "complete") pendientes++;
    }
    return { statsTotal: total, statsPendientes: pendientes, statsRecogidos: recogidos };
  }, [pedidos]);

  // ─── FILTERED PEDIDOS (memoized) ───
  const pedidosFiltrados = useMemo(() => {
    if (filtro === "pendientes") return pedidos.filter(p => ESTADOS[p.estado]?.group !== "complete");
    if (filtro === "recogidos") return pedidos.filter(p => p.estado === "Recogido");
    return pedidos;
  }, [pedidos, filtro]);

  // Reset render limit when filter/data changes
  useEffect(() => { setRenderLimit(30); }, [pedidosFiltrados]);

  const hasMorePedidos = renderLimit < pedidosFiltrados.length;

  // ─── BULK TRANSITIONS (intersection of valid transitions for all selected) ───
  const bulkTransitions = useMemo(() => {
    if (bulkSelected.size === 0) return [];
    const selected = pedidosFiltrados.filter(p => bulkSelected.has(p.id));
    if (selected.length === 0) return [];
    const sets = selected.map(p => new Set(ESTADO_TRANSITIONS[p.estado] || []));
    return [...sets[0]].filter(est => sets.every(s => s.has(est)));
  }, [bulkSelected, pedidosFiltrados]);

  // Group by date (memoized) — uses sliced list for progressive rendering
  const { groups, sortedDates } = useMemo(() => {
    const visible = pedidosFiltrados.slice(0, renderLimit);
    const g = {};
    visible.forEach(p => {
      const dateKey = (p.fecha || "").split("T")[0] || "sin-fecha";
      if (!g[dateKey]) g[dateKey] = [];
      g[dateKey].push(p);
    });
    return { groups: g, sortedDates: Object.keys(g).sort() };
  }, [pedidosFiltrados, renderLimit]);

  // IntersectionObserver: load more pedidos on scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setRenderLimit(l => l + 30);
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  });

  // Catalog search (memoized)
  const productosFiltrados = useMemo(() => {
    if (!searchProd) return [];
    const q = searchProd.toLowerCase();
    return catalogo.filter(p => p.nombre.toLowerCase().includes(q));
  }, [searchProd, catalogo]);

  // ─── PRODUCTION VIEW (memoized) ───
  const { prodView, totalPendiente, totalRecogido, activeProductCount } = useMemo(() => {
    if (!produccionData || produccionData.length === 0) {
      return { prodView: [], totalPendiente: 0, totalRecogido: 0, activeProductCount: 0 };
    }
    const view = produccionData.map(prod => {
      const pedsFiltrados = ocultarRecogidos ? prod.pedidos.filter(p => p.estado !== "Recogido" && p.estado !== "Listo para recoger" && p.recogido !== true) : prod.pedidos;
      const uds = pedsFiltrados.reduce((s, p) => s + p.unidades, 0);
      return { ...prod, pedidosFiltrados: pedsFiltrados, udsFiltradas: uds, udsRecogidas: prod.totalUnidades - uds };
    }).filter(p => p.udsFiltradas > 0 || !ocultarRecogidos);
    return {
      prodView: view,
      totalPendiente: view.reduce((s, p) => s + p.udsFiltradas, 0),
      totalRecogido: view.reduce((s, p) => s + p.udsRecogidas, 0),
      activeProductCount: view.filter(p => p.udsFiltradas > 0).length,
    };
  }, [produccionData, ocultarRecogidos]);

  // ─── SURPLUS VIEW (memoized) ───
  const surplusView = useMemo(() => {
    const items = new Map();
    for (const prod of produccionData) {
      const key = prod.nombre.toLowerCase().trim();
      items.set(key, { nombre: prod.nombre, pedidos: prod.totalUnidades, plan: surplusPlan[key] || 0 });
    }
    for (const [key, plan] of Object.entries(surplusPlan)) {
      if (!items.has(key) && plan > 0) {
        const cat = catalogo.find(c => c.nombre.toLowerCase().trim() === key);
        items.set(key, { nombre: cat?.nombre || key, pedidos: 0, plan });
      }
    }
    return Array.from(items.values())
      .map(it => ({ ...it, excedente: it.plan - it.pedidos }))
      .sort((a, b) => (b.pedidos > 0) - (a.pedidos > 0) || a.nombre.localeCompare(b.nombre, "es"));
  }, [produccionData, surplusPlan, catalogo]);

  const surplusTotals = useMemo(() => {
    const totalPlan = surplusView.reduce((s, p) => s + p.plan, 0);
    const totalPedidos = surplusView.reduce((s, p) => s + p.pedidos, 0);
    const totalDisp = surplusView.reduce((s, p) => s + Math.max(0, p.excedente), 0);
    return { totalPlan, totalPedidos, totalDisp };
  }, [surplusView]);

  const surplusSearchResults = useMemo(() => {
    if (!surplusSearch) return [];
    const q = surplusSearch.toLowerCase();
    const existing = new Set(surplusView.map(p => p.nombre.toLowerCase().trim()));
    return catalogo.filter(p => p.nombre.toLowerCase().includes(q) && !existing.has(p.nombre.toLowerCase().trim()));
  }, [surplusSearch, catalogo, surplusView]);

  const updateSurplus = useCallback((nombre, newVal) => {
    const key = nombre.toLowerCase().trim();
    setSurplusPlan(prev => {
      const next = { ...prev, [key]: Math.max(0, newVal) };
      if (next[key] === 0) delete next[key];
      saveSurplusPlan(produccionFecha, next);
      return next;
    });
  }, [produccionFecha]);

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{
      minHeight: "100vh",
      background: "#EFE9E4",
      fontFamily: "'Roboto Condensed', 'Segoe UI', system-ui, sans-serif",
      color: "#1B1C39",
      position: "relative",
      paddingBottom: 90,
    }}>
      {/* ════ HEADER ════ */}
      <header style={{
        background: "linear-gradient(180deg, #E1F2FC 0%, #EFE9E4 100%)",
        padding: isDesktop ? "16px 48px 12px" : "16px 20px 12px",
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid #A2C2D0",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: isDesktop ? 16 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 42, height: 42,
              background: "#ffffff",
              borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              border: "1px solid #A2C2D0",
            }}>
              <img src={VYNIA_LOGO} alt="Vynia" style={{ width: 34, height: 34, objectFit: "contain" }} />
            </div>
            <div style={{ position: "relative" }}>
              <h1 style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontSize: 15, fontWeight: 600,
                margin: 0, color: "#4F6867", letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>Pedidos</h1>
              <span onClick={() => setShowChangelog(v => !v)} style={{
                fontFamily: "Inter, sans-serif", fontSize: 9, color: "#A2C2D0",
                letterSpacing: "0.03em", cursor: "pointer",
              }}>v{__APP_VERSION__} · {new Date(__APP_BUILD_DATE__).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</span>
              {showChangelog && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, marginTop: 6,
                  background: "rgba(239,233,228,0.95)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                  borderRadius: 12, padding: "12px 16px", minWidth: 240, maxWidth: 320,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)",
                  zIndex: 80, animation: "popoverIn 0.18s ease-out",
                  border: "1px solid rgba(162,194,208,0.3)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1B1C39", marginBottom: 4 }}>
                    v{__APP_VERSION__} — {new Date(__APP_BUILD_DATE__).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  <div style={{ fontSize: 11, color: "#4F6867", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {__APP_CHANGELOG__ || "Sin notas de cambio"}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setShowChangelog(false); }} style={{
                    marginTop: 8, padding: "4px 12px", borderRadius: 8,
                    border: "1px solid #A2C2D0", background: "#fff", color: "#4F6867",
                    fontSize: 10, fontWeight: 600, cursor: "pointer",
                  }}>Cerrar</button>
                </div>
              )}
            </div>
          </div>

          {/* Stats pills — desktop: inline in header row */}
          {isDesktop && (
            <div style={{
              display: "flex", gap: 6, flex: 1, justifyContent: "center", maxWidth: 420,
            }}>
              {[
                { label: "Total", value: statsTotal, color: "#4F6867", bg: "#E1F2FC", filter: "todos" },
                { label: "Pendientes", value: statsPendientes, color: "#1B1C39", bg: "#E1F2FC", filter: "pendientes" },
                { label: "Recogidos", value: statsRecogidos, color: "#4F6867", bg: "#E1F2FC", filter: "recogidos" },
              ].map(s => (
                <button key={s.label} title={`Filtrar por ${s.label.toLowerCase()}`} onClick={() => { setTab("pedidos"); setFiltro(s.filter); }}
                  style={{
                    flex: 1, padding: "6px 8px", borderRadius: 10,
                    border: filtro === s.filter && tab === "pedidos" ? `1.5px solid ${s.color}` : "1px solid #A2C2D0",
                    background: filtro === s.filter && tab === "pedidos" ? s.bg : "#fff",
                    cursor: "pointer", textAlign: "center",
                    transition: "all 0.2s",
                  }}>
                  <div style={{
                    fontSize: 18, fontWeight: 800,
                    fontFamily: "'Roboto Condensed', sans-serif", color: s.color,
                    lineHeight: 1,
                  }}>{s.value}</div>
                  <div style={{
                    fontSize: 9, color: "#4F6867", marginTop: 2,
                    textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600,
                  }}>{s.label}</div>
                </button>
              ))}
            </div>
          )}

          <div ref={menuRef} style={{ position: "relative" }}>
            <button title="Menú" onClick={() => setShowMenu(v => !v)} style={{
              width: 34, height: 34, borderRadius: 9, border: "1px solid #A2C2D0",
              background: showMenu ? "#E1F2FC" : "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#4F6867",
            }}>
              <I.Menu />
            </button>
            {showMenu && (
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: 6,
                background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                borderRadius: 12, padding: 4, minWidth: 220,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)",
                border: "1px solid rgba(162,194,208,0.3)",
                zIndex: 80, animation: "popoverIn 0.18s ease-out",
              }}>
                {[
                  { icon: <I.Refresh s={16} />, label: "Recargar pedidos", action: () => { invalidateApiCache(); loadPedidos(); } },
                  { icon: <I.Printer s={16} />, label: "Imprimir", action: () => window.print() },
                  { icon: <I.Help s={16} />, label: "Manual de uso", action: () => { setHelpActiveCategory(tab === "produccion" ? "produccion" : tab === "nuevo" ? "nuevo" : "pedidos"); setHelpExpanded(new Set()); setShowHelp(true); } },
                  { icon: <I.Broom s={16} />, label: "Limpiar registros", action: cleanupOrphanRegistros },
                ].map((item, i) => (
                  <button key={i} onClick={() => { setShowMenu(false); item.action(); }} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", border: "none", background: "transparent",
                    cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 500,
                    color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif",
                    transition: "background 0.15s",
                  }} onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                     onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ color: "#4F6867", display: "flex" }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
                <div style={{ height: 1, background: "#A2C2D0", opacity: 0.3, margin: "4px 8px" }} />
                <button onClick={() => { setShowMenu(false); setApiMode(m => m === "demo" ? "live" : "demo"); }} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", border: "none", background: "transparent",
                  cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif",
                  transition: "background 0.15s",
                }} onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                   onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 16, height: 16, borderRadius: 8, fontSize: 10, fontWeight: 700,
                    background: apiMode === "live" ? "#4F6867" : "#A2C2D0",
                    color: "#fff",
                  }}>{apiMode === "live" ? "●" : "○"}</span>
                  <span style={{ letterSpacing: "0.04em", textTransform: "uppercase", fontSize: 11, fontWeight: 600 }}>
                    {apiMode === "live" ? "LIVE" : "DEMO"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats bar — mobile/tablet only (desktop renders inline above) */}
        <div style={{
          display: isDesktop ? "none" : "flex", gap: 8, marginTop: 14, overflow: "auto",
          scrollbarWidth: "none", msOverflowStyle: "none",
        }}>
          {[
            { label: "Total", value: statsTotal, color: "#4F6867", bg: "#E1F2FC", filter: "todos" },
            { label: "Pendientes", value: statsPendientes, color: "#1B1C39", bg: "#E1F2FC", filter: "pendientes" },
            { label: "Recogidos", value: statsRecogidos, color: "#4F6867", bg: "#E1F2FC", filter: "recogidos" },
          ].map(s => (
            <button key={s.label} title={`Filtrar por ${s.label.toLowerCase()}`} onClick={() => { setTab("pedidos"); setFiltro(s.filter); }}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 10,
                border: filtro === s.filter && tab === "pedidos" ? `1.5px solid ${s.color}` : "1px solid #A2C2D0",
                background: filtro === s.filter && tab === "pedidos" ? s.bg : "#fff",
                cursor: "pointer", textAlign: "center",
                transition: "all 0.2s",
              }}>
              <div style={{
                fontSize: 22, fontWeight: 800,
                fontFamily: "'Roboto Condensed', sans-serif", color: s.color,
                lineHeight: 1,
              }}>{s.value}</div>
              <div style={{
                fontSize: 10, color: "#4F6867", marginTop: 3,
                textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600,
              }}>{s.label}</div>
            </button>
          ))}
        </div>
      </header>

      {/* ════ PRINT HEADER (visible only when printing) ════ */}
      <div id="print-header" style={{ display: "none" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "0 16px 16px", borderBottom: "2px solid #1B1C39",
          marginBottom: 16,
        }}>
          <img src={VYNIA_LOGO} alt="Vynia" style={{ width: 48, height: 48 }} />
          <div>
            <h1 style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: 20, fontWeight: 700, margin: 0, color: "#1B1C39",
            }}>
              Vynia — Listado de Pedidos
            </h1>
            <p style={{ fontSize: 12, color: "#4F6867", margin: "4px 0 0" }}>
              {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {" · Filtro: "}{filtro.charAt(0).toUpperCase() + filtro.slice(1)}
              {" · "}{pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ════ TOAST ════ */}
      {toast && (
        <div style={{
          position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
          padding: "10px 20px", borderRadius: 10, zIndex: 200,
          background: toast.type === "ok" ? "#3D5655" : "#C62828",
          color: "#fff", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "slideIn 0.3s ease",
          maxWidth: "90%",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ════ LOADING ════ */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(253,251,247,0.8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 150, backdropFilter: "blur(4px)",
        }}>
          <div style={{
            width: 44, height: 44, border: "3px solid #A2C2D0",
            borderTopColor: "#4F6867", borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }} />
        </div>
      )}

      <main style={{ padding: isDesktop ? "0 48px" : "0 16px" }}>

        {/* ══════════════════════════════════════════
            TAB: PEDIDOS
        ══════════════════════════════════════════ */}
        {tab === "pedidos" && (
          <div style={{ paddingTop: 12 }}>
            {/* ── Date selector row ── */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
              <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "rgba(79,104,103,0.06)", border: "1px solid rgba(162,194,208,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderRadius: 14 }}>
                {[
                  { label: "Hoy", val: fmt.todayISO() },
                  { label: "Mañana", val: fmt.tomorrowISO() },
                  { label: "Pasado", val: fmt.dayAfterISO() },
                ].map(d => {
                  const sel = filtroFecha === d.val;
                  return (
                    <button key={d.label} title={`Ver pedidos de ${d.label.toLowerCase()}`}
                      onClick={() => { setFiltroFecha(d.val); loadPedidos(d.val); }}
                      style={{
                        position: "relative", padding: "7px 14px", borderRadius: 10,
                        border: "none",
                        background: sel ? "#E1F2FC" : "transparent",
                        color: sel ? "#1B1C39" : "#4F6867",
                        fontWeight: sel ? 700 : 500,
                        fontSize: 13, cursor: "pointer", transition: "all 0.25s",
                        fontFamily: "'Roboto Condensed', sans-serif",
                        boxShadow: sel ? "0 1px 4px rgba(79,104,103,0.1)" : "none",
                      }}>
                      {sel && <span style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", width: 24, height: 3, borderRadius: 2, background: "#4F6867", boxShadow: "0 0 8px 2px rgba(79,104,103,0.4), 0 0 20px 4px rgba(79,104,103,0.15)", animation: "tubelightGlow 2s ease-in-out infinite" }} />}
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ width: 140, position: "relative", display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: 9, pointerEvents: "none", zIndex: 1, color: "#4F6867", display: "flex" }}><I.Cal s={14} /></div>
                <input type="date" lang="es" value={filtroFecha || ""}
                  onChange={e => { const v = e.target.value || null; setFiltroFecha(v); loadPedidos(v); }}
                  title="Seleccionar fecha concreta"
                  style={{
                    width: "100%", padding: "9px 8px 9px 30px", borderRadius: 10,
                    border: filtroFecha && ![fmt.todayISO(), fmt.tomorrowISO(), fmt.dayAfterISO(), null].includes(filtroFecha)
                      ? "2px solid #4F6867" : "1.5px solid #d4cec6",
                    background: filtroFecha && ![fmt.todayISO(), fmt.tomorrowISO(), fmt.dayAfterISO(), null].includes(filtroFecha)
                      ? "#E1F2FC" : "#fff",
                    fontSize: 13, color: "#1B1C39",
                    outline: "none",
                  }} />
              </div>
            </div>

            {/* ── Status filter pills + search ── */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
              <div id="filter-pills" style={{ display: "inline-flex", gap: 4, padding: 4, background: "rgba(79,104,103,0.06)", border: "1px solid rgba(162,194,208,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderRadius: 24 }}>
                {[
                  { key: "pendientes", label: "Pendientes" },
                  { key: "recogidos", label: "Recogidos" },
                  { key: "todos", label: "Todos" },
                ].map(f => {
                  const sel = filtro === f.key;
                  return (
                    <button key={f.key} title={`Filtrar: ${f.label}`} onClick={() => setFiltro(f.key)}
                      style={{
                        position: "relative", padding: "7px 14px", borderRadius: 18, fontSize: 12,
                        border: "none",
                        background: sel ? "#E1F2FC" : "transparent",
                        color: sel ? "#1B1C39" : "#4F6867",
                        fontWeight: sel ? 700 : 500,
                        cursor: "pointer", transition: "all 0.25s",
                        fontFamily: "'Roboto Condensed', sans-serif",
                        boxShadow: sel ? "0 1px 4px rgba(79,104,103,0.1)" : "none",
                      }}>
                      {sel && <span style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", width: 24, height: 3, borderRadius: 2, background: "#4F6867", boxShadow: "0 0 8px 2px rgba(79,104,103,0.4), 0 0 20px 4px rgba(79,104,103,0.15)", animation: "tubelightGlow 2s ease-in-out infinite" }} />}
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <button className={`flow-btn${bulkMode ? " flow-btn-active" : ""}`} title={bulkMode ? "Cancelar selección" : "Seleccionar pedidos"} onClick={() => {
                if (bulkMode) { setBulkMode(false); setBulkSelected(new Set()); }
                else { setBulkMode(true); setBulkSelected(new Set()); }
              }}
                style={{
                  position: "relative", overflow: "hidden",
                  padding: "7px 16px 7px 14px", borderRadius: 100, fontSize: 12,
                  border: `1.5px solid ${bulkMode ? "transparent" : "rgba(79,104,103,0.35)"}`,
                  background: bulkMode ? "#C62828" : "transparent",
                  color: bulkMode ? "#fff" : "#4F6867",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.6s cubic-bezier(0.23,1,0.32,1)",
                  fontFamily: "'Roboto Condensed', sans-serif",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 6, transition: "transform 0.6s ease-out" }}>
                  {bulkMode ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg> : <I.Check s={12} />}
                  <span>{bulkMode ? "Cancelar" : "Seleccionar"}</span>
                </span>
                <span className="flow-btn-circle" style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: bulkMode ? 220 : 0, height: bulkMode ? 220 : 0,
                  background: "#C62828", borderRadius: "50%",
                  transition: "all 0.8s cubic-bezier(0.19,1,0.22,1)",
                }} />
              </button>
              <div ref={clienteWrapperRef} style={{ position: "relative", flex: 1, minWidth: 180 }}>
                <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#A2C2D0", pointerEvents: "none" }}>
                  <I.Search s={16} />
                </div>
                <input placeholder="Buscar cliente..."
                  value={busqueda} onChange={e => onBusquedaChange(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 10px 8px 36px", borderRadius: 20,
                    border: "1.5px solid #d4cec6", fontSize: 13,
                    background: "#fff", color: "#1B1C39",
                    outline: "none", boxSizing: "border-box",
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }} />
                {/* Search results dropdown */}
                {searchResults.length > 0 && !fichaCliente && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0,
                    background: "rgba(239,233,228,0.88)",
                    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    borderRadius: 16, marginTop: 4, padding: 4,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)",
                    zIndex: 60,
                    maxHeight: 260, overflowY: "auto",
                    animation: "popoverIn 0.18s ease-out",
                  }}>
                    <div style={{
                      background: "rgba(255,255,255,0.95)",
                      borderRadius: 14, overflow: "hidden",
                      border: "1px solid rgba(162,194,208,0.25)",
                      boxShadow: "0 0 0 0.5px rgba(0,0,0,0.04)",
                    }}>
                      {searchResults.map(c => (
                        <div key={c.id} onClick={() => openFichaCliente(c)}
                          style={{
                            padding: "11px 14px", cursor: "pointer",
                            borderBottom: "1px solid rgba(162,194,208,0.15)",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#1B1C39" }}>{c.nombre}</div>
                          <div style={{ fontSize: 12, color: "#4F6867", marginTop: 2 }}>
                            {[c.telefono, c.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div title={mostrarPrecios ? "Ocultar importes" : "Ver importes"} onClick={() => setMostrarPrecios(v => !v)}
                role="button" tabIndex={0}
                style={{
                  display: "flex", alignItems: "center", gap: 8, flexShrink: 0, cursor: "pointer",
                }}>
                <span style={{
                  fontSize: 11, fontWeight: 500, color: "#4F6867",
                  fontFamily: "'Roboto Condensed', sans-serif",
                  whiteSpace: "nowrap",
                }}>{mostrarPrecios ? "Ocultar importes" : "Ver importes"}</span>
                <div style={{
                  width: 44, height: 24, padding: 2, borderRadius: 12,
                  background: mostrarPrecios ? "#4F6867" : "rgba(162,194,208,0.35)",
                  border: `1px solid ${mostrarPrecios ? "#4F6867" : "rgba(162,194,208,0.5)"}`,
                  transition: "all 0.3s cubic-bezier(0.23,1,0.32,1)",
                  display: "flex", alignItems: "center",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 9,
                    background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transform: mostrarPrecios ? "translateX(20px)" : "translateX(0)",
                    transition: "transform 0.3s cubic-bezier(0.23,1,0.32,1)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  }}>
                    <I.Euro />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Ficha cliente ── */}
            {fichaCliente ? (
              <div style={{
                background: "#fff", borderRadius: 14, border: "1px solid #A2C2D0",
                padding: "16px 18px", marginBottom: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <button onClick={() => { closeFicha(); setEditingClienteData(null); }} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13, color: "#4F6867", fontWeight: 600, padding: 0,
                    display: "flex", alignItems: "center", gap: 4,
                    fontFamily: "'Roboto Condensed', sans-serif",
                  }}>
                    ← Volver
                  </button>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a href={`https://notion.so/${fichaCliente.id.replace(/-/g, "")}`} target="_blank" rel="noopener noreferrer"
                      title="Ver en Notion"
                      style={{
                        background: "#F5F0EB", border: "1px solid #d4cec6", borderRadius: 8,
                        padding: "4px 10px", fontSize: 12, color: "#4F6867", fontWeight: 600,
                        textDecoration: "none", display: "flex", alignItems: "center", gap: 4,
                        fontFamily: "'Roboto Condensed', sans-serif", cursor: "pointer",
                      }}>
                      <span style={{ fontSize: 14 }}>N</span> Notion
                    </a>
                    {!editingClienteData ? (
                      <button onClick={() => setEditingClienteData({ nombre: fichaCliente.nombre, telefono: fichaCliente.telefono || "", email: fichaCliente.email || "" })}
                        title="Editar cliente"
                        style={{
                          background: "#F5F0EB", border: "1px solid #d4cec6", borderRadius: 8,
                          padding: "4px 10px", fontSize: 12, color: "#4F6867", fontWeight: 600,
                          fontFamily: "'Roboto Condensed', sans-serif", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                        <I.Edit s={13} /> Editar
                      </button>
                    ) : (
                      <button onClick={() => setEditingClienteData(null)}
                        style={{
                          background: "#F5F0EB", border: "1px solid #d4cec6", borderRadius: 8,
                          padding: "4px 10px", fontSize: 12, color: "#C62828", fontWeight: 600,
                          fontFamily: "'Roboto Condensed', sans-serif", cursor: "pointer",
                        }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
                {editingClienteData ? (
                  <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { label: "Nombre", key: "nombre", type: "text", icon: null },
                      { label: "Telefono", key: "telefono", type: "tel", icon: <I.Phone s={14} /> },
                      { label: "Email", key: "email", type: "email", icon: <I.Mail s={14} /> },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#4F6867", textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          {f.icon && <span style={{ color: "#A2C2D0" }}>{f.icon}</span>}
                          <input
                            value={editingClienteData[f.key]}
                            onChange={e => setEditingClienteData(prev => ({ ...prev, [f.key]: e.target.value }))}
                            type={f.type}
                            style={{
                              flex: 1, padding: "7px 10px", borderRadius: 8,
                              border: "1.5px solid #d4cec6", fontSize: 13,
                              background: "#FDFBF7", color: "#1B1C39", outline: "none",
                              fontFamily: "'Roboto Condensed', sans-serif",
                            }}
                            onFocus={e => e.target.style.borderColor = "#4F6867"}
                            onBlur={e => e.target.style.borderColor = "#d4cec6"}
                          />
                        </div>
                      </div>
                    ))}
                    <button onClick={saveClienteData} disabled={savingCliente || !editingClienteData.nombre.trim()}
                      style={{
                        marginTop: 4, padding: "8px 0", borderRadius: 8, border: "none",
                        background: savingCliente ? "#A2C2D0" : "#4F6867", color: "#fff",
                        fontSize: 13, fontWeight: 700, cursor: savingCliente ? "default" : "pointer",
                        fontFamily: "'Roboto Condensed', sans-serif",
                        opacity: !editingClienteData.nombre.trim() ? 0.5 : 1,
                      }}>
                      {savingCliente ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginBottom: 14 }}>
                    <h2 style={{
                      margin: 0, fontSize: 20, fontWeight: 700, color: "#1B1C39",
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}>{fichaCliente.nombre}</h2>
                    <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
                      {fichaCliente.telefono && (
                        <span style={{ fontSize: 13, color: "#4F6867", display: "flex", alignItems: "center", gap: 4 }}>
                          <I.Phone /> {fichaCliente.telefono}
                        </span>
                      )}
                      {fichaCliente.email && (
                        <span style={{ fontSize: 13, color: "#4F6867", display: "flex", alignItems: "center", gap: 4 }}>
                          <I.Mail s={13} /> {fichaCliente.email}
                        </span>
                      )}
                      {!fichaCliente.telefono && !fichaCliente.email && (
                        <span style={{ fontSize: 13, color: "#A2C2D0", fontStyle: "italic" }}>Sin datos de contacto</span>
                      )}
                    </div>
                  </div>
                )}
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "#4F6867",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  marginBottom: 8, borderTop: "1px solid #f0ece6", paddingTop: 12,
                }}>Pedidos</div>
                {fichaClienteLoading ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#A2C2D0" }}>
                    <div style={{
                      width: 28, height: 28, border: "2px solid #A2C2D0",
                      borderTopColor: "#4F6867", borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                      margin: "0 auto",
                    }} />
                  </div>
                ) : fichaClientePedidos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#A2C2D0", fontSize: 13 }}>
                    No tiene pedidos
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {fichaClientePedidos.map(p => (
                      <div key={p.id} onClick={() => { setPedidoFromFicha(true); setSelectedPedido({ ...p, pedidoTitulo: p.nombre, tel: p.tel, telefono: p.tel, productos: typeof p.productos === "string" ? parseProductsStr(p.productos) : (Array.isArray(p.productos) ? p.productos : []) }); }}
                        style={{
                          background: "#FDFBF7", borderRadius: 10,
                          border: `1px solid ${ESTADOS[p.estado]?.group === "complete" ? (ESTADOS[p.estado]?.color + "40") : "#A2C2D0"}`,
                          padding: "10px 14px", cursor: "pointer",
                          opacity: ESTADOS[p.estado]?.group === "complete" ? 0.65 : 1,
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{
                                fontSize: 14, fontWeight: 600, color: "#1B1C39",
                                textDecoration: p.estado === "Recogido" ? "line-through" : "none",
                              }}>
                                {p.numPedido > 0 ? `#${p.numPedido}` : "Pedido"}
                              </span>
                              {p.estado !== "Sin empezar" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: ESTADOS[p.estado]?.bg || "#F0F0F0", color: ESTADOS[p.estado]?.color || "#8B8B8B", fontWeight: 700, border: `0.5px solid ${ESTADOS[p.estado]?.color || "#8B8B8B"}22` }}>{ESTADOS[p.estado]?.label || p.estado}</span>}
                              {p.pagado && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#E1F2FC", color: "#3D5655", fontWeight: 700 }}>PAGADO</span>}
                            </div>
                            <div style={{ fontSize: 12, color: "#4F6867", marginTop: 3 }}>
                              {fmt.date(p.fecha?.split("T")[0] || "")}
                              {(p.hora || fmt.time(p.fecha)) ? ` · ${p.hora || fmt.time(p.fecha)}` : ""}
                            </div>
                          </div>
                          <span style={{ fontSize: 12, color: "#A2C2D0" }}>→</span>
                        </div>
                        {p.notas && (
                          <div style={{ fontSize: 11, color: "#A2C2D0", marginTop: 4, fontStyle: "italic" }}>
                            {p.notas.length > 60 ? p.notas.substring(0, 60) + "…" : p.notas}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Orders grouped by date */}
                {pedidosFiltrados.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "40px 20px",
                    color: "#A2C2D0",
                  }}>
                    <img src={VYNIA_LOGO_MD} alt="Vynia" style={{ width: 60, height: 60, opacity: 0.35, filter: "grayscale(30%)" }} />
                    <p style={{ marginTop: 12, fontSize: 14 }}>No hay pedidos con este filtro</p>
                  </div>
                ) : (
                  sortedDates.map(dateKey => (
                    <div key={dateKey} style={{ marginBottom: 20 }}>
                      {/* Date header */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                        marginBottom: 8, padding: "0 4px",
                      }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: "#4F6867",
                          textTransform: "uppercase", letterSpacing: "0.06em",
                        }}>
                          {fmt.isToday(dateKey) ? "Hoy" :
                            fmt.isTomorrow(dateKey) ? "Mañana" :
                              fmt.date(dateKey)}
                        </span>
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 10,
                          background: "#E1F2FC", color: "#4F6867", fontWeight: 600,
                        }}>
                          {groups[dateKey].length}
                        </span>
                        {fmt.isPast(dateKey) && !fmt.isToday(dateKey) && (
                          <span style={{ fontSize: 10, color: "#C4402F", fontWeight: 600 }}>
                            <I.AlertTri s={10} c="#C4402F" /> PASADO
                          </span>
                        )}
                      </div>

                      {/* Order cards — split by Mañana/Tarde */}
                      {(() => {
                        const tardeSet = new Set();
                        for (const p of groups[dateKey]) { if (esTarde(p)) tardeSet.add(p.id); }
                        const manana = groups[dateKey].filter(p => !tardeSet.has(p.id));
                        const tarde = groups[dateKey].filter(p => tardeSet.has(p.id));
                        const gridStyle = { display: "grid", gridTemplateColumns: isDesktop ? "repeat(auto-fill, minmax(320px, 1fr))" : isTablet ? "repeat(2, 1fr)" : "1fr", gap: isDesktop ? 16 : 8 };
                        const renderCards = (list) => list.map(p => {
                          const isBulkSel = bulkMode && bulkSelected.has(p.id);
                          return (
                            <div key={p.id} className="order-card" onClick={bulkMode ? () => {
                              setBulkSelected(prev => {
                                const next = new Set(prev);
                                next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                                return next;
                              });
                            } : undefined} style={{
                              background: isBulkSel ? "#E1F2FC" : "#fff",
                              borderRadius: 14,
                              border: isBulkSel ? "2px solid #4F6867" : `1px solid ${ESTADOS[p.estado]?.group === "complete" ? (ESTADOS[p.estado]?.color + "40") : "#A2C2D0"}`,
                              padding: "14px 16px",
                              boxShadow: isBulkSel ? "0 2px 8px rgba(79,104,103,0.18)" : "0 1px 4px rgba(60,50,30,0.04)",
                              opacity: ESTADOS[p.estado]?.group === "complete" && !bulkMode ? 0.65 : 1,
                              transition: "all 0.2s",
                              cursor: bulkMode ? "pointer" : undefined,
                              position: "relative",
                            }}>
                              {/* Estado actual — cabecera prominente */}
                              <div className="estado-header" style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "10px 14px", marginBottom: 12,
                                borderRadius: 10,
                                background: `linear-gradient(135deg, ${ESTADOS[p.estado]?.bg || "#F0F0F0"}, ${ESTADOS[p.estado]?.bg || "#F0F0F0"}90)`,
                                border: `1.5px solid ${ESTADOS[p.estado]?.color || "#A2C2D0"}30`,
                                boxShadow: `0 2px 8px ${ESTADOS[p.estado]?.color || "#8B8B8B"}12`,
                                position: "relative", overflow: "hidden",
                              }}>
                                {/* Shimmer overlay */}
                                <div style={{
                                  position: "absolute", inset: 0,
                                  background: `linear-gradient(90deg, transparent 0%, ${ESTADOS[p.estado]?.color || "#8B8B8B"}08 50%, transparent 100%)`,
                                  pointerEvents: "none",
                                }} />
                                <div style={{
                                  padding: "6px", borderRadius: 8,
                                  background: `linear-gradient(135deg, ${ESTADOS[p.estado]?.color || "#8B8B8B"}20, ${ESTADOS[p.estado]?.color || "#8B8B8B"}10)`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                  <EstadoGauge estado={p.estado} size={44} />
                                </div>
                                <div style={{ position: "relative", zIndex: 1 }}>
                                  <div style={{
                                    fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
                                    color: ESTADOS[p.estado]?.color || "#8B8B8B",
                                  }}>
                                    {ESTADOS[p.estado]?.label || "Sin empezar"}
                                  </div>
                                  <div style={{
                                    fontSize: 10, color: ESTADOS[p.estado]?.color || "#8B8B8B",
                                    opacity: 0.7, marginTop: 1,
                                  }}>
                                    {ESTADO_PROGRESS[p.estado] === 1 ? "Completado" :
                                      ESTADO_PROGRESS[p.estado] > 0 ? `${Math.round((ESTADO_PROGRESS[p.estado] || 0) * 100)}% del pipeline` :
                                        "Pipeline pendiente"}
                                  </div>
                                </div>
                              </div>

                              {/* Top row: name + time + amount (clickable for detail) */}
                              <div onClick={bulkMode ? undefined : () => setSelectedPedido({
                                ...p,
                                pedidoTitulo: p.nombre,
                                tel: p.tel, telefono: p.tel,
                                productos: typeof p.productos === "string" ? parseProductsStr(p.productos) : (Array.isArray(p.productos) ? p.productos : []),
                              })} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: bulkMode ? "default" : "pointer" }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {bulkMode && (
                                      <span style={{
                                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                                        border: isBulkSel ? "2px solid #4F6867" : "2px solid #ccc",
                                        background: isBulkSel ? "#4F6867" : "transparent",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        transition: "all 0.15s", color: "#fff", fontSize: 13, fontWeight: 700,
                                      }}>
                                        {isBulkSel && "✓"}
                                      </span>
                                    )}
                                    <span style={{
                                      fontSize: 15, fontWeight: 700,
                                      color: ESTADOS[p.estado]?.group === "complete" ? "#4F6867" : "#1B1C39",
                                      textDecoration: p.estado === "Recogido" ? "line-through" : "none",
                                      overflowWrap: "break-word", wordBreak: "break-word",
                                    }}>
                                      {p.cliente || p.nombre}
                                    </span>
                                    {p.pagado && (
                                      <span style={{
                                        fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                                        background: "#E1F2FC", color: "#3D5655",
                                      }}>PAGADO</span>
                                    )}
                                    {tardeSet.has(p.id) && (
                                      <span style={{
                                        fontSize: 9, padding: "2px 6px", borderRadius: 4,
                                        background: "#FFF3E0", color: "#E65100", fontWeight: 700,
                                      }}>TARDE</span>
                                    )}
                                  </div>

                                  {/* Details */}
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 6 }}>
                                    {(p.hora || fmt.time(p.fecha)) && (
                                      <span style={{ fontSize: 12, color: "#4F6867", display: "flex", alignItems: "center", gap: 3 }}>
                                        <I.Clock /> {p.hora || fmt.time(p.fecha)}
                                      </span>
                                    )}
                                    {p.tel && (
                                      <span onClick={(e) => openPhoneMenu(p.tel, e)} style={{
                                        fontSize: 12, color: "#1B1C39", display: "flex", alignItems: "center", gap: 3,
                                        cursor: "pointer",
                                      }}>
                                        <I.Phone /> {p.tel}
                                      </span>
                                    )}
                                  </div>

                                  {/* Products */}
                                  {p.productos && (
                                    <div style={{
                                      fontSize: 12, color: "#4F6867", marginTop: 6,
                                      lineHeight: 1.4,
                                    }}>
                                      {typeof p.productos === "string" ? p.productos :
                                        Array.isArray(p.productos) ? p.productos.map(x =>
                                          typeof x === "object" ? (x.plain_text || x.title || JSON.stringify(x)) : x
                                        ).join(", ") : ""}
                                    </div>
                                  )}

                                  {p.notas && (
                                    <div style={{
                                      fontSize: 11, color: "#1B1C39", marginTop: 4,
                                      fontStyle: "italic", overflowWrap: "break-word", wordBreak: "break-word",
                                    }}>
                                      📝 {p.notas}
                                    </div>
                                  )}
                                </div>

                                {/* Amount */}
                                {mostrarPrecios && <div style={{ textAlign: "right", minWidth: 60 }}>
                                  <span style={{
                                    fontSize: 18, fontWeight: 800,
                                    fontFamily: "'Roboto Condensed', sans-serif",
                                    color: "#4F6867",
                                  }}>
                                    {typeof p.importe === "number" && p.importe > 0 ? `${p.importe.toFixed(2)}€` : "—"}
                                  </span>
                                </div>}
                              </div>

                              {/* Action buttons (hidden in bulk mode) */}
                              {!bulkMode && <div className="card-actions" style={{
                                display: "flex", gap: 8, marginTop: 10,
                                borderTop: "1px solid #E1F2FC", paddingTop: 10,
                              }}>
                                {/* Primary: advance to next logical state */}
                                {(() => {
                                  const next = ESTADO_NEXT[p.estado];
                                  if (!next) return null;
                                  const cfg = ESTADOS[next];
                                  const action = ESTADO_ACTION[next] || cfg.label;
                                  return (
                                    <button className="estado-btn" title={`→ ${next}`} onClick={() => requestEstadoChange(p, next)}
                                      style={{
                                        flex: 1, padding: "7px 0", borderRadius: 8,
                                        border: `1.5px solid ${cfg.color}30`,
                                        fontSize: 11, fontWeight: 600, letterSpacing: "0.01em",
                                        cursor: "pointer", display: "flex",
                                        alignItems: "center", justifyContent: "center", gap: 5,
                                        background: `${cfg.color}15`,
                                        color: cfg.color,
                                      }}>
                                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        {action}
                                        <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" style={{ width: 13, height: 13, opacity: 0.7 }}>
                                          <path d="M9 5l7 7-7 7" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                                        </svg>
                                      </span>
                                    </button>
                                  );
                                })()}

                                {/* Estado picker: shows current state + opens full picker */}
                                <button className="estado-btn" title="Más opciones de estado" onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setEstadoPicker({ pedidoId: p.id, currentEstado: p.estado, x: rect.left + rect.width / 2, y: rect.bottom + 4 });
                                }}
                                  style={{
                                    padding: "10px 12px", borderRadius: 12,
                                    border: `1.5px solid ${ESTADOS[p.estado]?.color || "#A2C2D0"}35`,
                                    background: `linear-gradient(135deg, ${ESTADOS[p.estado]?.bg || "#F0F0F0"}, ${ESTADOS[p.estado]?.bg || "#F0F0F0"}dd)`,
                                    color: ESTADOS[p.estado]?.color || "#4F6867",
                                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: 5,
                                    boxShadow: `0 2px 6px ${ESTADOS[p.estado]?.color || "#4F6867"}15`,
                                  }}>
                                  <div className="btn-shimmer" style={{ background: `linear-gradient(90deg, transparent 0%, ${ESTADOS[p.estado]?.color || "#4F6867"}15 50%, transparent 100%)` }} />
                                  <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 5 }}>
                                    ···
                                  </span>
                                </button>

                                {/* Pagado toggle */}
                                <button title={p.pagado ? "Desmarcar como pagado" : "Marcar como pagado"} onClick={() => requestPagadoChange(p)}
                                  style={{
                                    padding: "7px 12px", borderRadius: 8,
                                    border: p.pagado ? "1.5px solid #4F686735" : "1.5px solid rgba(162,194,208,0.35)",
                                    background: p.pagado ? "linear-gradient(135deg, #E1F2FC, #E1F2FCdd)" : "transparent",
                                    color: p.pagado ? "#3D5655" : "#A2C2D0",
                                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: 5,
                                    transition: "all 0.2s",
                                  }}>
                                  {p.pagado ? <><I.Check s={13} /> Pagado</> : "€ Pago"}
                                </button>
                              </div>}
                            </div>
                          );
                        });
                        return (
                          <>
                            {manana.length > 0 && (
                              <>
                                {tarde.length > 0 && (
                                  <div style={{
                                    fontSize: 11, fontWeight: 700, color: "#4F6867",
                                    textTransform: "uppercase", letterSpacing: "0.06em",
                                    padding: "4px 0", marginBottom: 4
                                  }}>
                                    Mañana
                                  </div>
                                )}
                                <div style={gridStyle}>{renderCards(manana)}</div>
                              </>
                            )}
                            {tarde.length > 0 && (
                              <>
                                <div style={{
                                  fontSize: 11, fontWeight: 700, color: "#E65100",
                                  textTransform: "uppercase", letterSpacing: "0.06em",
                                  padding: "4px 0", marginTop: manana.length > 0 ? 10 : 0, marginBottom: 4
                                }}>
                                  Tarde
                                </div>
                                <div style={gridStyle}>{renderCards(tarde)}</div>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ))
                )}
                {hasMorePedidos && (
                  <div ref={sentinelRef} style={{
                    textAlign: "center", padding: "16px 0 8px", color: "#A2C2D0", fontSize: 12,
                  }}>
                    Mostrando {Math.min(renderLimit, pedidosFiltrados.length)} de {pedidosFiltrados.length} pedidos…
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: NUEVO PEDIDO
        ══════════════════════════════════════════ */}
        {tab === "nuevo" && createResult ? (
          <div style={{ paddingTop: 16 }}>
            {createResult.status === "ok" ? (
              <div style={{
                textAlign: "center", padding: "60px 20px",
                background: "#fff", borderRadius: 16, marginTop: 12,
                border: "1px solid #A2C2D0",
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "linear-gradient(135deg, #4F6867, #3D5655)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}>
                  <I.Check s={32} />
                </div>
                <h2 style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 22, fontWeight: 700, color: "#1B1C39", margin: "0 0 6px",
                }}>Pedido creado</h2>
                <p style={{ color: "#4F6867", fontSize: 14, margin: 0 }}>
                  {createResult.cliente} — {createResult.total.toFixed(2)}€
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28 }}>
                  <button onClick={() => verPedidoCreado(createResult.pedidoId)} style={{
                    padding: "11px 22px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", color: "#fff",
                    background: "linear-gradient(135deg, #4F6867, #3D5655)",
                    boxShadow: "0 2px 8px rgba(79,104,103,0.3)",
                  }}>Ver pedido</button>
                  <button onClick={() => setCreateResult(null)} style={{
                    padding: "11px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", color: "#4F6867",
                    border: "1.5px solid #A2C2D0", background: "transparent",
                  }}>Crear otro</button>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center", padding: "60px 20px",
                background: "#FDE8E5", borderRadius: 16, marginTop: 12,
                border: "1px solid #EF9A9A",
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "#C62828",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", color: "#fff", fontSize: 28, fontWeight: 800,
                }}>!</div>
                <h2 style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 22, fontWeight: 700, color: "#C62828", margin: "0 0 6px",
                }}>No se pudo crear el pedido</h2>
                <p style={{ color: "#4F6867", fontSize: 13, margin: "0 0 4px", overflowWrap: "break-word" }}>
                  {createResult.message}
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28 }}>
                  <button onClick={() => setCreateResult(null)} style={{
                    padding: "11px 22px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", color: "#fff",
                    background: "#C62828",
                    boxShadow: "0 2px 8px rgba(198,40,40,0.3)",
                  }}>Reintentar</button>
                </div>
              </div>
            )}
          </div>
        ) : tab === "nuevo" && (
          <div style={{ paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 16px" }}>
              <h2 style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontSize: 22, fontWeight: 700,
                margin: 0, color: "#1B1C39",
              }}>Nuevo Pedido</h2>
              {nuevoPaso === 1 && (
                <button title="Pegar mensaje de WhatsApp" className="parse-btn"
                  onClick={() => { setParseText(""); setParseImage(null); setParseResult(null); setParseError(null); setShowParseModal(true); }}
                  style={{
                    position: "relative", overflow: "hidden",
                    padding: "10px 16px", borderRadius: 14,
                    border: "1.5px solid rgba(79,104,103,0.35)",
                    background: "linear-gradient(135deg, rgba(79,104,103,0.12), rgba(27,28,57,0.08))",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                    transition: "all 0.3s ease-out",
                    boxShadow: "0 3px 12px rgba(79,104,103,0.12)",
                  }}>
                  <div className="parse-btn-shine" />
                  <div style={{
                    padding: 7, borderRadius: 9,
                    background: "linear-gradient(135deg, rgba(79,104,103,0.5), rgba(79,104,103,0.3))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.3s",
                  }}>
                    <I.Clipboard s={16} c="#fff" />
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif", lineHeight: 1.2 }}>Pegar pedido</div>
                    <div style={{ fontSize: 10, color: "#4F6867", opacity: 0.75 }}>Texto, imagen o voz</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F6867"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="parse-btn-arrow"
                    style={{ opacity: 0.35, transition: "all 0.3s" }}>
                    <path d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              )}
            </div>

            {nuevoPaso === 1 && (
            <>
              <div style={{
                display: isDesktop ? "grid" : "block",
                gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
                gap: isDesktop ? 16 : 0,
                alignItems: "start",
              }}>
                {/* ── Left column (desktop) ── */}
                <div>
                  {/* ── Cliente ── */}
                <section style={{
                  background: "#fff", borderRadius: 14, padding: "16px",
                  border: "1px solid #A2C2D0", marginBottom: 12,
                }}>
                  <label style={labelStyle}>
                    <I.User s={13} /> Cliente
                  </label>
                  <div ref={clienteWrapperRef} style={{ position: "relative" }}>
                    <input placeholder="Nombre del cliente" value={cliente}
                      onChange={e => onClienteChange(e.target.value)}
                      onKeyDown={e => { if (e.key === "Escape") setClienteSuggestions([]); }}
                      autoComplete="off"
                      style={inputStyle} />
                    {clienteSuggestions.length > 0 && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                        background: "rgba(239,233,228,0.88)",
                        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                        borderRadius: 14, marginTop: 4, padding: 3,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)",
                        maxHeight: 200, overflowY: "auto",
                        animation: "popoverIn 0.15s ease-out",
                      }}>
                        <div style={{
                          background: "rgba(255,255,255,0.95)", borderRadius: 12,
                          overflow: "hidden", border: "1px solid rgba(162,194,208,0.25)",
                        }}>
                          {clienteSuggestions.map(c => (
                            <button key={c.id} onClick={() => selectCliente(c)} style={{
                              display: "block", width: "100%", padding: "11px 14px",
                              border: "none", background: "transparent", cursor: "pointer",
                              textAlign: "left", fontSize: 13, transition: "background 0.15s",
                              borderBottom: "1px solid rgba(162,194,208,0.15)",
                            }}
                              onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <span style={{ fontWeight: 600, color: "#1B1C39" }}>{c.nombre}</span>
                              {c.telefono && (
                                <span style={{ fontSize: 11, color: "#A2C2D0", marginLeft: 8 }}>{c.telefono}</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedClienteId && (
                    <p style={{ fontSize: 10, color: "#4F6867", margin: "4px 0 0", fontWeight: 600 }}>
                      Cliente vinculado
                    </p>
                  )}
                  <input placeholder="Teléfono (opcional)" value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    type="tel"
                    style={{ ...inputStyle, marginTop: 8 }} />
                  <p style={{ fontSize: 10, color: "#A2C2D0", margin: "6px 0 0" }}>
                    Si no existe, se creará automáticamente en Notion
                  </p>
                </section>

                  {/* ── Notas + Pagado ── */}
                <section style={{
                  background: "#fff", borderRadius: 14, padding: "16px",
                  border: "1px solid #A2C2D0", marginBottom: 16,
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Notas</label>
                      <textarea value={notas} onChange={e => setNotas(e.target.value)}
                        placeholder="Notas del pedido..."
                        rows={2}
                        style={{
                          ...inputStyle, resize: "vertical",
                          fontFamily: "inherit", marginTop: 8,
                        }} />
                    </div>
                    <div style={{ textAlign: "center", paddingTop: 4 }}>
                      <label style={{ ...labelStyle, marginBottom: 8, display: "block" }}>Pagado</label>
                      <button title={pagado ? "Desmarcar como pagado" : "Marcar como pagado al reservar"} onClick={() => setPagado(!pagado)}
                        style={{
                          width: 52, height: 52, borderRadius: 14,
                          border: pagado ? "2.5px solid #4F6867" : "2px solid #A2C2D0",
                          background: pagado ? "#E1F2FC" : "transparent",
                          cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center",
                          color: pagado ? "#3D5655" : "#A2C2D0",
                          fontSize: 20, transition: "all 0.2s",
                        }}>
                        {pagado ? <I.Check s={22} /> : "€"}
                      </button>
                    </div>
                  </div>
                </section>
                </div>
                {/* ── Right column (desktop) ── */}
                <div>
                  {/* ── Productos ── */}
                <section style={{
                  background: "#fff", borderRadius: 14, padding: "16px",
                  border: "1px solid #A2C2D0", marginBottom: 12,
                }}>
                  <label style={labelStyle}>
                    <I.Box s={13} /> Productos
                  </label>

                  {/* Search bar */}
                  <div style={{ position: "relative", marginTop: 8 }}>
                    <div style={{
                      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      color: "#A2C2D0", pointerEvents: "none",
                    }}><I.Search s={16} /></div>
                    <input ref={searchRef}
                      placeholder="Buscar producto..."
                      value={searchProd}
                      onChange={e => setSearchProd(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 36 }} />
                  </div>

                  {/* Search results dropdown */}
                  {searchProd && productosFiltrados.length > 0 && (
                    <div style={{
                      marginTop: 4, maxHeight: 220, overflowY: "auto",
                      borderRadius: 14, padding: 3,
                      background: "rgba(239,233,228,0.88)",
                      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)",
                      animation: "popoverIn 0.15s ease-out",
                    }}>
                      <div style={{
                        background: "rgba(255,255,255,0.95)", borderRadius: 12,
                        overflow: "hidden", border: "1px solid rgba(162,194,208,0.25)",
                      }}>
                        {productosFiltrados.slice(0, 8).map((p, i) => (
                          <button key={p.nombre} onClick={() => addProducto(p)}
                            style={{
                              width: "100%", padding: "10px 14px",
                              border: "none",
                              borderBottom: i < productosFiltrados.length - 1 ? "1px solid rgba(162,194,208,0.15)" : "none",
                              background: "transparent", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              fontSize: 13, textAlign: "left", transition: "background 0.15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ color: "#4F6867", fontWeight: 700, fontSize: 15 }}>+</span>
                              <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                              <span style={{
                                fontSize: 9, padding: "1px 5px", borderRadius: 3,
                                background: p.cat === "Panadería" ? "#E1F2FC" : "#E1F2FC",
                                color: p.cat === "Panadería" ? "#4F6867" : "#1B1C39",
                                fontWeight: 600,
                              }}>{p.cat === "Panadería" ? "PAN" : "PAST"}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: "#4F6867" }}>{p.precio.toFixed(2)}€</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick buttons */}
                  {!searchProd && lineas.length === 0 && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize: 10, color: "#A2C2D0", margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Más pedidos:
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {FRECUENTES.map(name => {
                          const p = catalogo.find(c => c.nombre === name);
                          if (!p) return null;
                          return (
                            <button key={name} onClick={() => addProducto(p)}
                              style={{
                                padding: "6px 11px", borderRadius: 18, fontSize: 11,
                                border: "1px solid #A2C2D0", background: "#EFE9E4",
                                cursor: "pointer", color: "#1B1C39",
                                transition: "all 0.12s", fontWeight: 500,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "#E1F2FC"; e.currentTarget.style.borderColor = "#4F6867"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "#EFE9E4"; e.currentTarget.style.borderColor = "#A2C2D0"; }}
                            >
                              + {name.length > 20 ? name.substring(0, 18) + "…" : name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cart lines */}
                  {lineas.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      {lineas.map((l, i) => (
                        <div key={l.nombre} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "10px 0",
                          borderBottom: i < lineas.length - 1 ? "1px solid #E1F2FC" : "none",
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>{l.nombre}</div>
                            <div style={{ fontSize: 11, color: "#4F6867" }}>{l.precio.toFixed(2)}€/ud</div>
                          </div>

                          {/* Quantity controls */}
                          <div style={{
                            display: "flex", alignItems: "center",
                            background: "#E1F2FC", borderRadius: 10, overflow: "hidden",
                          }}>
                            <button title="Quitar una unidad" onClick={() => updateQty(l.nombre, -1)}
                              style={{
                                width: 34, height: 34, border: "none", background: "transparent",
                                cursor: "pointer", display: "flex", alignItems: "center",
                                justifyContent: "center", color: "#4F6867",
                              }}><I.Minus /></button>
                            <NumberFlow
                              value={l.cantidad}
                              format={{ useGrouping: false }}
                              style={{
                                width: 28, textAlign: "center", fontSize: 15,
                                fontWeight: 800, color: "#1B1C39",
                                fontFamily: "'Roboto Condensed', sans-serif",
                              }}
                              willChange
                            />
                            <button title="Añadir una unidad" onClick={() => updateQty(l.nombre, 1)}
                              style={{
                                width: 34, height: 34, border: "none", background: "transparent",
                                cursor: "pointer", display: "flex", alignItems: "center",
                                justifyContent: "center", color: "#4F6867",
                              }}><I.Plus s={14} /></button>
                          </div>

                          <span style={{
                            minWidth: 52, textAlign: "right",
                            fontSize: 14, fontWeight: 700, color: "#4F6867",
                          }}>{(l.cantidad * l.precio).toFixed(2)}€</span>

                          <button title="Eliminar producto del pedido" onClick={() => setLineas(ls => ls.filter(x => x.nombre !== l.nombre))}
                            style={{
                              width: 30, height: 30, borderRadius: 8, border: "none",
                              background: "transparent", cursor: "pointer",
                              color: "#E57373", display: "flex",
                              alignItems: "center", justifyContent: "center",
                            }}><I.Trash /></button>
                        </div>
                      ))}

                      {/* Total bar */}
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "12px 14px", marginTop: 8,
                        background: "linear-gradient(135deg, #E1F2FC, #E1F2FC)",
                        borderRadius: 12,
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1B1C39" }}>
                          {totalItems} {totalItems === 1 ? "producto" : "productos"}
                        </span>
                        <span style={{
                          fontSize: 24, fontWeight: 800,
                          fontFamily: "'Roboto Condensed', sans-serif", color: "#1B1C39",
                        }}>{totalPedido.toFixed(2)}€</span>
                      </div>
                    </div>
                  )}
                </section>
                </div>
              </div>{/* end 2-column grid */}

              {/* ── Submit Paso 1 ── */}
              <button title="Siguiente paso: elegir fecha" onClick={() => {
                setNuevoPaso(2);
                if (apiMode !== "demo" && lineas.length > 0) {
                  setSuggestionsLoading(true);
                  notion.loadProduccionRango(fmt.todayISO(), 7)
                    .then(data => setDateSuggestions(computeDateSuggestions(data.produccion || {}, lineas)))
                    .catch(() => setDateSuggestions([]))
                    .finally(() => setSuggestionsLoading(false));
                }
              }}
                disabled={!cliente.trim() || lineas.length === 0}
                style={{
                  width: "100%", padding: "16px",
                  borderRadius: 14, border: "none",
                  background: (!cliente.trim() || lineas.length === 0)
                    ? "#A2C2D0"
                    : "linear-gradient(135deg, #4F6867, #1B1C39)",
                  color: "#fff",
                  fontSize: 16, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Roboto Condensed', sans-serif",
                  boxShadow: (!cliente.trim() || lineas.length === 0)
                    ? "none" : "0 4px 16px rgba(166,119,38,0.35)",
                  transition: "all 0.3s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  letterSpacing: "-0.01em",
                }}>
                Siguiente: Elegir fecha
              </button>
            </>
            )}

            {nuevoPaso === 2 && (
              <div>
                <button 
                  onClick={() => setNuevoPaso(1)}
                  style={{
                    background: "transparent", border: "none", padding: "8px 0",
                    color: "#4F6867", fontWeight: 600, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6, marginBottom: 12
                  }}>
                  <I.Back s={16} /> Volver a datos del pedido
                </button>

                {/* ── Sugerencias de fecha ── */}
                {(suggestionsLoading || dateSuggestions.length > 0) && (
                  <section style={{
                    background: "#fff", borderRadius: 14, padding: "14px 16px",
                    border: "1px solid #A2C2D0", marginBottom: 12,
                  }}>
                    <label style={{ ...labelStyle, marginBottom: 8 }}>
                      <span style={{ fontSize: 14 }}>&#128161;</span> Sugerencias de fecha
                    </label>
                    {suggestionsLoading ? (
                      <div style={{ textAlign: "center", padding: "8px 0", color: "#A2C2D0", fontSize: 12 }}>
                        Analizando produccion...
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {dateSuggestions.slice(0, 3).map(s => {
                          const d = new Date(s.date + "T12:00:00");
                          const dayName = DAY_NAMES[d.getDay()];
                          const isSelected = fecha === s.date;
                          return (
                            <button key={s.date} onClick={() => setFecha(s.date)}
                              title={`Seleccionar ${dayName} ${fmt.date(s.date)}: ${s.overlapping.map(p => p.nombre).join(", ")}`}
                              style={{
                                display: "flex", flexDirection: "column", gap: 2,
                                padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                                border: isSelected ? "2px solid #4F6867" : "1.5px solid #A2C2D0",
                                background: isSelected ? "#E1F2FC" : "#FAFAFA",
                                textAlign: "left", transition: "all 0.15s",
                              }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                <span style={{
                                  fontWeight: 700, fontSize: 13, color: "#1B1C39",
                                  fontFamily: "'Roboto Condensed', sans-serif",
                                }}>
                                  {dayName} {fmt.date(s.date)}
                                </span>
                                <span style={{
                                  fontSize: 11, fontWeight: 600, color: "#4F6867",
                                  background: "#E1F2FC", borderRadius: 6, padding: "2px 8px",
                                }}>
                                  {s.overlapCount} {s.overlapCount === 1 ? "producto" : "productos"} en comun
                                </span>
                              </div>
                              <div style={{
                                fontSize: 11, color: "#A2C2D0", fontWeight: 500,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                maxWidth: "100%",
                              }}>
                                {s.overlapping.map(p => `${p.nombre} (${p.totalUnidades}u)`).join(", ")}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}

                {/* ── Fecha ── */}
                <section style={{
                  background: "#fff", borderRadius: 14, padding: "16px",
                  border: "1px solid #A2C2D0", marginBottom: 12,
                }}>
                  <label style={labelStyle}>
                    <I.Cal s={13} /> Entrega
                  </label>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {[
                      { label: "Hoy", val: fmt.todayISO() },
                      { label: "Mañana", val: fmt.tomorrowISO() },
                      { label: "Pasado", val: fmt.dayAfterISO() },
                    ].map(d => (
                      <button key={d.label} title={`Fecha de entrega: ${d.label.toLowerCase()}`} onClick={() => setFecha(d.val)}
                        style={{
                          flex: 1, padding: "10px 0", borderRadius: 10,
                          border: fecha === d.val ? "2px solid #4F6867" : "1.5px solid #A2C2D0",
                          background: fecha === d.val ? "#E1F2FC" : "#EFE9E4",
                          color: fecha === d.val ? "#1B1C39" : "#4F6867",
                          fontWeight: fecha === d.val ? 700 : 500,
                          fontSize: 13, cursor: "pointer",
                          transition: "all 0.15s",
                        }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <div style={{ position: "absolute", left: 10, pointerEvents: "none", zIndex: 1, color: "#4F6867", display: "flex" }}><I.Cal s={14} /></div>
                      <input type="date" lang="es" value={fecha}
                        onChange={e => setFecha(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: 30, border: "2px solid #4F6867", background: "#fff" }} />
                    </div>
                    <input type="time" value={hora}
                      onChange={e => setHora(e.target.value)}
                      placeholder="Hora"
                      style={inputStyle} />
                  </div>
                </section>

                {/* ── Submit ── */}
            <button title="Crear nuevo pedido en Notion" onClick={crearPedido}
              disabled={!cliente.trim() || !fecha || lineas.length === 0}
              style={{
                width: "100%", padding: "16px",
                borderRadius: 14, border: "none",
                background: (!cliente.trim() || !fecha || lineas.length === 0)
                  ? "#A2C2D0"
                  : "linear-gradient(135deg, #4F6867, #1B1C39)",
                color: (!cliente.trim() || !fecha || lineas.length === 0)
                  ? "#fff" : "#fff",
                fontSize: 16, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Roboto Condensed', sans-serif",
                boxShadow: (!cliente.trim() || !fecha || lineas.length === 0)
                  ? "none" : "0 4px 16px rgba(166,119,38,0.35)",
                transition: "all 0.3s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                letterSpacing: "-0.01em",
              }}>
              <I.Send s={18} />
              {lineas.length > 0
                ? `Crear pedido — ${totalPedido.toFixed(2)}€`
                : "Crear pedido"}
            </button>
                <p style={{
                  textAlign: "center", fontSize: 10, color: "#A2C2D0",
                  marginTop: 8,
                }}>
                  {apiMode === "demo" 
                    ? "Modo demo: el pedido se añade localmente"
                    : "Se creará pedido + registros + cliente en Notion"}
                </p>
              </div>
            )}
          </div>
        )}
        {/* ══════════════════════════════════════════
            TAB: PRODUCCION DIARIA
        ══════════════════════════════════════════ */}
        {tab === "produccion" && (
          <div style={{ paddingTop: 16 }}>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontSize: 22, fontWeight: 700,
              margin: "0 0 16px", color: "#1B1C39",
            }}>Producción Diaria</h2>

            {/* Date selector + toggle — inline on desktop */}
            <div style={{
              display: isDesktop ? "flex" : "block",
              gap: isDesktop ? 16 : 0,
              alignItems: "center",
              marginBottom: 14,
            }}>
              <div style={{ display: "flex", gap: 8, marginBottom: isDesktop ? 0 : 14, flex: isDesktop ? 1 : undefined, alignItems: "center" }}>
                <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "rgba(79,104,103,0.06)", border: "1px solid rgba(162,194,208,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderRadius: 14, flex: 1 }}>
                {[
                  { label: "Hoy", val: fmt.todayISO() },
                  { label: "Mañana", val: fmt.tomorrowISO() },
                  { label: "Pasado", val: fmt.dayAfterISO() },
                ].map(d => {
                  const sel = produccionFecha === d.val;
                  return (
                  <button key={d.label} title={`Ver producción de ${d.label.toLowerCase()}`} onClick={() => { setProduccionFecha(d.val); setExpandedProduct(null); setExpandAll(false); loadProduccion(d.val); }}
                    style={{
                      position: "relative", flex: 1, padding: "8px 0", borderRadius: 10,
                      border: "none",
                      background: sel ? "#E1F2FC" : "transparent",
                      color: sel ? "#1B1C39" : "#4F6867",
                      fontWeight: sel ? 700 : 500,
                      fontSize: 13, cursor: "pointer",
                      transition: "all 0.25s",
                      boxShadow: sel ? "0 1px 4px rgba(79,104,103,0.1)" : "none",
                    }}>
                    {sel && <span style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", width: 24, height: 3, borderRadius: 2, background: "#4F6867", boxShadow: "0 0 8px 2px rgba(79,104,103,0.4), 0 0 20px 4px rgba(79,104,103,0.15)", animation: "tubelightGlow 2s ease-in-out infinite" }} />}
                    {d.label}
                  </button>
                  );
                })}
                </div>
                <div style={{ flex: 0.6, position: "relative", display: "flex", alignItems: "center" }}>
                  <div style={{ position: "absolute", left: 9, pointerEvents: "none", zIndex: 1, color: "#4F6867", display: "flex" }}><I.Cal s={14} /></div>
                  <input type="date" lang="es" value={produccionFecha}
                    onChange={e => { setProduccionFecha(e.target.value); setExpandedProduct(null); setExpandAll(false); loadProduccion(e.target.value); }}
                    style={{
                      width: "100%", padding: "8px 8px 8px 30px", borderRadius: 10,
                      border: "1px solid rgba(162,194,208,0.3)", fontSize: 13,
                      background: "#fff", color: "#1B1C39",
                      outline: "none",
                    }} />
                </div>
              </div>

              {/* Toggle recogidos */}
              <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "rgba(79,104,103,0.06)", border: "1px solid rgba(162,194,208,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderRadius: 14, flex: isDesktop ? "none" : undefined }}>
                {[
                  { label: "Pendiente", val: true, tip: "Ver solo producción pendiente" },
                  { label: "Todo el día", val: false, tip: "Ver toda la producción del día" },
                ].map(f => {
                  const sel = ocultarRecogidos === f.val;
                  return (
                    <button key={f.label} title={f.tip} onClick={() => { setOcultarRecogidos(f.val); setExpandAll(false); setExpandedProduct(null); }}
                      style={{
                        position: "relative", flex: 1, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        border: "none",
                        background: sel ? "#E1F2FC" : "transparent",
                        color: sel ? "#1B1C39" : "#4F6867",
                        transition: "all 0.25s",
                        boxShadow: sel ? "0 1px 4px rgba(79,104,103,0.1)" : "none",
                      }}>
                      {sel && <span style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", width: 24, height: 3, borderRadius: 2, background: "#4F6867", boxShadow: "0 0 8px 2px rgba(79,104,103,0.4), 0 0 20px 4px rgba(79,104,103,0.15)", animation: "tubelightGlow 2s ease-in-out infinite" }} />}
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>{/* end date+toggle wrapper */}

            {/* ═══ SURPLUS: Planificación de producción (desplegable) ═══ */}
            {(() => {
              const hasPlan = Object.keys(surplusPlan).length > 0;
              const isOpen = surplusEditing;
              const hasContent = isOpen || surplusInfoOpen || (!isOpen && hasPlan);

              return (
                <div data-surplus-section style={{
                  marginBottom: 14, borderRadius: 14, overflow: "hidden",
                  background: hasContent ? "#fff" : "transparent",
                  border: hasContent ? "1px solid #A2C2D0" : "none",
                  boxShadow: hasContent ? "0 1px 4px rgba(60,50,30,0.04)" : "none",
                }}>
                  {/* ── Header: siempre visible, toggle del desplegable ── */}
                  <div
                    title={isOpen ? "Cerrar planificacion" : "Abrir planificacion"}
                    onClick={() => setSurplusEditing(!surplusEditing)}
                    style={{
                      padding: isOpen ? "12px 16px" : "14px 16px",
                      background: "linear-gradient(135deg, #4F6867, #3D5655)",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      color: "#fff", cursor: "pointer",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.92"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                      <I.Store s={isOpen ? 18 : 20} />
                      <div style={{ textAlign: "left", overflow: "hidden" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Roboto Condensed', sans-serif" }}>
                          {isOpen ? "Planificacion del dia" : hasPlan ? "Produccion planificada" : "Planificar produccion"}
                        </div>
                        {!isOpen && (
                          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 1 }}>
                            {hasPlan
                              ? `${surplusTotals.totalPlan} plan · ${surplusTotals.totalPedidos} pedidos · ${surplusTotals.totalDisp} disp.`
                              : "Introduce lo que vas a producir"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {/* Info button */}
                      <button
                        title="Como funciona la planificacion"
                        onClick={e => { e.stopPropagation(); setSurplusInfoOpen(v => !v); }}
                        style={{
                          width: 24, height: 24, borderRadius: "50%",
                          border: "1.5px solid rgba(255,255,255,0.4)",
                          background: surplusInfoOpen ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
                          color: "#fff", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "background 0.15s",
                        }}
                      >
                        <I.Info s={13} />
                      </button>
                      {/* Chevron toggle */}
                      <span style={{
                        display: "flex", alignItems: "center",
                        transform: `rotate(${isOpen ? -90 : 90}deg)`,
                        transition: "transform 0.2s ease",
                        opacity: 0.8,
                      }}>
                        <I.Chevron s={14} />
                      </span>
                    </div>
                  </div>

                  {/* ── Info panel (inline, toggle con boton ℹ) ── */}
                  {surplusInfoOpen && (
                    <div style={{
                      padding: "12px 16px",
                      background: "#E1F2FC",
                      borderBottom: (isOpen || hasPlan) ? "1px solid #A2C2D0" : "none",
                      fontSize: 12, lineHeight: 1.6, color: "#1B1C39",
                      animation: "popoverIn 0.15s ease-out",
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <I.Info s={14} /> Como funciona
                      </div>
                      <p style={{ margin: "0 0 8px" }}>
                        Introduce las unidades que vas a producir hoy. El sistema compara tu plan con los pedidos existentes y calcula cuantos productos quedan disponibles para venta directa.
                      </p>
                      <p style={{ margin: "0 0 8px" }}>
                        Busca productos en el catalogo o usa los accesos rapidos frecuentes. Ajusta las cantidades con los botones +/−. Si reduces a 0, el producto se elimina del plan.
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "0 0 8px", alignItems: "center" }}>
                        <span>Badges:</span>
                        <span style={{ display: "inline-block", padding: "0 5px", borderRadius: 3, background: "#E8F5E9", color: "#2E7D32", fontWeight: 700, fontSize: 11 }}>+3</span>
                        <span>sobra para venta</span>
                        <span style={{ display: "inline-block", padding: "0 5px", borderRadius: 3, background: "#FFEBEE", color: "#C62828", fontWeight: 700, fontSize: 11 }}>-2</span>
                        <span>faltan unidades</span>
                        <span style={{ display: "inline-block", padding: "0 5px", borderRadius: 3, background: "#F5F5F5", color: "#8B8B8B", fontWeight: 700, fontSize: 11 }}>0</span>
                        <span>cantidad justa</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>
                        Los datos se guardan en tu navegador para cada dia y se mantienen hasta 7 dias.
                      </p>
                    </div>
                  )}

                  {/* ── Contenido desplegable: editor de cantidades ── */}
                  {isOpen && (
                    <div style={{ padding: "12px 16px 16px", animation: "popoverIn 0.15s ease-out" }}>
                      {/* Search */}
                      <div style={{ position: "relative", marginBottom: 8 }}>
                        <div style={{
                          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                          color: "#A2C2D0", pointerEvents: "none",
                        }}><I.Search s={14} /></div>
                        <input
                          placeholder="Buscar producto para anadir..."
                          value={surplusSearch}
                          onChange={e => setSurplusSearch(e.target.value)}
                          style={{
                            width: "100%", padding: "9px 12px 9px 32px", borderRadius: 10,
                            border: "1.5px solid #E8E0D4", fontSize: 12,
                            background: "#EFE9E4", outline: "none", fontFamily: "inherit",
                          }} />
                      </div>

                      {/* Search results dropdown */}
                      {surplusSearch && surplusSearchResults.length > 0 && (
                        <div style={{
                          marginBottom: 8, maxHeight: 180, overflowY: "auto",
                          borderRadius: 14, padding: 3,
                          background: "rgba(239,233,228,0.88)",
                          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)",
                          animation: "popoverIn 0.15s ease-out",
                        }}>
                          <div style={{
                            background: "rgba(255,255,255,0.95)", borderRadius: 12,
                            overflow: "hidden", border: "1px solid rgba(162,194,208,0.25)",
                          }}>
                            {surplusSearchResults.slice(0, 6).map((p, i) => (
                              <button key={p.nombre} onClick={() => { updateSurplus(p.nombre, 1); setSurplusSearch(""); }}
                                style={{
                                  width: "100%", padding: "9px 14px", border: "none",
                                  borderBottom: i < surplusSearchResults.length - 1 ? "1px solid rgba(162,194,208,0.15)" : "none",
                                  background: "transparent", cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: 6,
                                  fontSize: 12, textAlign: "left", transition: "background 0.15s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                              >
                                <span style={{ color: "#4F6867", fontWeight: 700, fontSize: 14 }}>+</span>
                                <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                                <span style={{
                                  fontSize: 9, padding: "1px 5px", borderRadius: 3,
                                  background: "#E1F2FC",
                                  color: p.cat === "Panaderia" ? "#4F6867" : "#1B1C39",
                                  fontWeight: 600,
                                }}>{p.cat === "Panaderia" ? "PAN" : "PAST"}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick add pills */}
                      {!surplusSearch && surplusView.length === 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                          {FRECUENTES.map(name => {
                            const existing = surplusView.find(p => p.nombre.toLowerCase().trim() === name.toLowerCase().trim());
                            if (existing) return null;
                            return (
                              <button key={name} title={`Anadir ${name}`} onClick={() => updateSurplus(name, 1)}
                                style={{
                                  padding: "4px 10px", borderRadius: 8,
                                  border: "1px solid #E8E0D4", background: "#EFE9E4",
                                  fontSize: 11, cursor: "pointer", color: "#4F6867",
                                  fontWeight: 500, transition: "all 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#E1F2FC"; e.currentTarget.style.borderColor = "#4F6867"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "#EFE9E4"; e.currentTarget.style.borderColor = "#E8E0D4"; }}
                              >+ {name.length > 20 ? name.slice(0, 18) + "..." : name}</button>
                            );
                          })}
                        </div>
                      )}

                      {/* Product rows with steppers + excedente */}
                      {surplusView.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {surplusView.map(item => (
                            <div key={item.nombre} style={{
                              padding: "10px 12px", borderRadius: 10,
                              background: "#FAFAFA", border: "1px solid #E8E0D4",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                <I.Box s={14} />
                                <div style={{ overflow: "hidden", minWidth: 0 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1B1C39", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{item.nombre}</span>
                                  {item.pedidos > 0 && (
                                    <span style={{ fontSize: 10, color: "#A2C2D0" }}>{item.pedidos} en pedidos</span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                                  <button title="Reducir cantidad" onClick={() => updateSurplus(item.nombre, item.plan - 1)}
                                    style={{
                                      width: 30, height: 30, borderRadius: "8px 0 0 8px",
                                      border: "1.5px solid #A2C2D0", borderRight: "none",
                                      background: "#EFE9E4", cursor: "pointer",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      color: "#4F6867", opacity: item.plan === 0 ? 0.3 : 1,
                                    }} disabled={item.plan === 0}>
                                    <I.Minus s={12} />
                                  </button>
                                  <div style={{
                                    width: 42, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                                    borderTop: "1.5px solid #A2C2D0", borderBottom: "1.5px solid #A2C2D0",
                                    background: "#fff", fontSize: 15, fontWeight: 700,
                                    color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif",
                                  }}>
                                    <NumberFlow value={item.plan} />
                                  </div>
                                  <button title="Aumentar cantidad" onClick={() => updateSurplus(item.nombre, item.plan + 1)}
                                    style={{
                                      width: 30, height: 30, borderRadius: "0 8px 8px 0",
                                      border: "1.5px solid #A2C2D0", borderLeft: "none",
                                      background: "#EFE9E4", cursor: "pointer",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      color: "#4F6867",
                                    }}>
                                    <I.Plus s={12} />
                                  </button>
                                </div>
                                {item.pedidos > 0 && (
                                  <span style={{
                                    fontSize: 11, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
                                    fontFamily: "'Roboto Condensed', sans-serif", minWidth: 24, textAlign: "center",
                                    background: item.excedente > 0 ? "#E8F5E9" : item.excedente < 0 ? "#FFEBEE" : "#F5F5F5",
                                    color: item.excedente > 0 ? "#2E7D32" : item.excedente < 0 ? "#C62828" : "#8B8B8B",
                                  }}>
                                    {(item.excedente > 0 ? "+" : "") + item.excedente}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {/* Inline add more pills */}
                          {!surplusSearch && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                              {FRECUENTES.map(name => {
                                const existing = surplusView.find(p => p.nombre.toLowerCase().trim() === name.toLowerCase().trim());
                                if (existing) return null;
                                return (
                                  <button key={name} title={`Anadir ${name}`} onClick={() => updateSurplus(name, 1)}
                                    style={{
                                      padding: "3px 8px", borderRadius: 6,
                                      border: "1px solid #E8E0D4", background: "#EFE9E4",
                                      fontSize: 10, cursor: "pointer", color: "#4F6867",
                                      fontWeight: 500, transition: "all 0.15s",
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#E1F2FC"; e.currentTarget.style.borderColor = "#4F6867"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "#EFE9E4"; e.currentTarget.style.borderColor = "#E8E0D4"; }}
                                  >+ {name.length > 20 ? name.slice(0, 18) + "..." : name}</button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Resumen compacto: visible cuando cerrado con plan ── */}
                  {!isOpen && hasPlan && (
                    <div style={{ padding: "8px 16px 10px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {surplusView.map(item => (
                          <div key={item.nombre} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "6px 0",
                            borderBottom: "1px solid #F0EDE8",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                              <I.Box s={12} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: "#1B1C39", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nombre}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                              <span style={{ fontSize: 11, color: "#A2C2D0" }}>Plan: {item.plan}</span>
                              <span style={{ fontSize: 11, color: "#A2C2D0" }}>Ped: {item.pedidos}</span>
                              <span style={{
                                fontSize: 11, fontWeight: 800, padding: "1px 6px", borderRadius: 4,
                                fontFamily: "'Roboto Condensed', sans-serif",
                                background: item.excedente > 0 ? "#E8F5E9" : item.excedente < 0 ? "#FFEBEE" : "#F5F5F5",
                                color: item.excedente > 0 ? "#2E7D32" : item.excedente < 0 ? "#C62828" : "#8B8B8B",
                              }}>
                                {(item.excedente > 0 ? "+" : "") + item.excedente}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Product list */}
            {(() => {
              if (produccionData.length === 0) return (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#A2C2D0" }}>
                  <I.Store s={40} />
                  <p style={{ marginTop: 12, fontSize: 14 }}>No hay producción para este día</p>
                  <button title="Cargar datos de producción" onClick={() => loadProduccion()} style={{
                    marginTop: 8, padding: "8px 16px", borderRadius: 8,
                    border: "1px solid #A2C2D0", background: "#fff",
                    cursor: "pointer", fontSize: 12, color: "#4F6867", fontWeight: 600,
                  }}>Cargar</button>
                </div>
              );

              return (
                <div>
                  {/* Summary */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", marginBottom: 12,
                    background: "#E1F2FC", borderRadius: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#4F6867" }}>
                        {activeProductCount} {activeProductCount === 1 ? "producto" : "productos"}
                      </span>
                      <button
                        title={expandAll ? "Contraer todos los productos" : "Desplegar todos los productos"}
                        onClick={() => { setExpandAll(!expandAll); setExpandedProduct(null); }}
                        style={{
                          border: "1.5px solid #4F6867", background: expandAll ? "#4F6867" : "transparent",
                          color: expandAll ? "#fff" : "#4F6867", borderRadius: 6, padding: "2px 8px",
                          fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                        }}
                      >{expandAll ? "Contraer" : "Desplegar"}</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {totalRecogido > 0 && (
                        <span style={{ fontSize: 11, color: "#A2C2D0", textDecoration: "line-through" }}>
                          {totalRecogido} recogidas
                        </span>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif" }}>
                        {totalPendiente} uds pendientes
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {prodView.map(prod => {
                      if (prod.udsFiltradas === 0 && ocultarRecogidos) return null;
                      return (
                        <div key={prod.nombre} style={{
                          background: "#fff", borderRadius: 14, border: "1px solid #A2C2D0",
                          overflow: "hidden",
                          boxShadow: "0 1px 4px rgba(60,50,30,0.04)",
                        }}>
                          {/* Product row */}
                          <button title={(expandAll || expandedProduct === prod.nombre) ? "Contraer producto" : "Ver pedidos de este producto"} onClick={() => {
                            if (expandAll) { setExpandAll(false); setExpandedProduct(prod.nombre); }
                            else setExpandedProduct(expandedProduct === prod.nombre ? null : prod.nombre);
                          }}
                            style={{
                              width: "100%", padding: "14px 16px",
                              border: "none", background: "transparent",
                              cursor: "pointer", display: "flex",
                              alignItems: "center", justifyContent: "space-between",
                              textAlign: "left",
                            }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <I.Box s={18} />
                              <span style={{ fontSize: 15, fontWeight: 600, color: "#1B1C39" }}>
                                {prod.nombre}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {prod.udsRecogidas > 0 && (
                                <span style={{ fontSize: 12, color: "#A2C2D0", textDecoration: "line-through" }}>
                                  {prod.udsRecogidas}
                                </span>
                              )}
                              <span style={{
                                fontSize: 18, fontWeight: 800, color: "#4F6867",
                                fontFamily: "'Roboto Condensed', sans-serif",
                              }}>
                                {prod.udsFiltradas} uds
                              </span>
                              <span style={{
                                fontSize: 10, color: "#A2C2D0",
                                transform: (expandAll || expandedProduct === prod.nombre) ? "rotate(90deg)" : "rotate(0deg)",
                                transition: "transform 0.2s",
                              }}>▶</span>
                            </div>
                          </button>

                          {/* Expanded: pedidos list */}
                          {(expandAll || expandedProduct === prod.nombre) && (
                            <div style={{
                              borderTop: "1px solid #E1F2FC",
                              padding: "8px 16px 12px",
                              background: "#FAFAFA",
                            }}>
                              <p style={{ fontSize: 10, color: "#A2C2D0", margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Pedidos con {prod.nombre}:
                              </p>
                              {(ocultarRecogidos ? prod.pedidosFiltrados : prod.pedidos).map((ped, i) => (
                                <button title="Ver detalle del pedido" key={ped.pedidoId + "-" + i} onClick={() => setSelectedPedido({ ...ped, id: ped.pedidoId, estado: effectiveEstado(ped), tel: ped.telefono || ped.tel })}
                                  style={{
                                    width: "100%", padding: "10px 12px",
                                    border: "none",
                                    borderBottom: i < (ocultarRecogidos ? prod.pedidosFiltrados : prod.pedidos).length - 1 ? "1px solid #E1F2FC" : "none",
                                    background: "transparent", cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    textAlign: "left", fontSize: 13,
                                    opacity: (ped.estado === "Recogido" || ped.recogido) ? 0.5 : 1,
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                >
                                  <div>
                                    <span style={{ fontWeight: 600, color: "#1B1C39", textDecoration: (ped.estado === "Recogido" || ped.recogido) ? "line-through" : "none" }}>
                                      {ped.cliente || (ped.pedidoTitulo || "").replace(/^Pedido\s+/i, "") || "Sin nombre"}
                                    </span>
                                    {ped.estado && ped.estado !== "Sin empezar" && (
                                      <span style={{
                                        fontSize: 9, padding: "1px 5px", borderRadius: 3,
                                        background: ESTADOS[ped.estado]?.bg || "#F0F0F0",
                                        color: ESTADOS[ped.estado]?.color || "#8B8B8B",
                                        fontWeight: 700, marginLeft: 6,
                                        border: `0.5px solid ${ESTADOS[ped.estado]?.color || "#8B8B8B"}22`,
                                      }}>{ESTADOS[ped.estado]?.label || ped.estado}</span>
                                    )}
                                    {ped.estado !== "Recogido" && (
                                      <button title={ped.pagado ? "Desmarcar como pagado" : "Marcar como pagado"} onClick={(e) => { e.stopPropagation(); requestPagadoChange({ id: ped.pedidoId, pagado: ped.pagado }); }}
                                        style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 700, cursor: "pointer", border: "none", marginLeft: 6, transition: "all 0.2s",
                                          background: ped.pagado ? "#E1F2FC" : "rgba(162,194,208,0.15)", color: ped.pagado ? "#3D5655" : "#A2C2D0",
                                        }}>{ped.pagado ? "PAGADO" : "€"}</button>
                                    )}
                                    {ped.notas && (
                                      <div style={{ fontSize: 11, color: "#A2C2D0", fontStyle: "italic", marginTop: 2 }}>
                                        {ped.notas}
                                      </div>
                                    )}
                                  </div>
                                  <span style={{ fontWeight: 700, color: (ped.estado === "Recogido" || ped.recogido) ? "#A2C2D0" : "#4F6867", textDecoration: (ped.estado === "Recogido" || ped.recogido) ? "line-through" : "none" }}>
                                    {ped.unidades} ud{ped.unidades !== 1 ? "s" : ""}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* ══════════════════════════════════════════
            MODAL: DETALLE PEDIDO
        ══════════════════════════════════════════ */}
        {selectedPedido && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200, padding: 20,
          }} onClick={() => { setSelectedPedido(null); setEditingFecha(null); setConfirmCancel(null); setEditingProductos(false); setEditLineas([]); setEditSearchProd(""); setPedidoFromFicha(false); }}>
            <div style={{
              background: "rgba(255,255,255,0.97)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderRadius: 20, padding: "24px 20px",
              maxWidth: isDesktop ? 540 : 400, width: "100%",
              boxShadow: "0 12px 48px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.06)",
              border: "1px solid rgba(162,194,208,0.2)",
              maxHeight: isDesktop ? "85vh" : "80vh", overflowY: "auto",
              animation: "modalIn 0.22s ease-out",
            }} onClick={e => e.stopPropagation()}>
              {/* ═══ HEADER: Avatar + Name + Badges + Close ═══ */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "linear-gradient(135deg, #4F6867, #3D5655)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 18, fontWeight: 800,
                  fontFamily: "'Roboto Condensed', sans-serif",
                  flexShrink: 0,
                }}>
                  {(selectedPedido.cliente || selectedPedido.pedidoTitulo || "P").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif", overflowWrap: "break-word", wordBreak: "break-word" }}>
                      {selectedPedido.cliente || (selectedPedido.pedidoTitulo || "").replace(/^Pedido\s+/i, "") || "Pedido"}
                    </h3>
                    {selectedPedido.numPedido > 0 && (
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "#E1F2FC", color: "#4F6867", fontWeight: 700, border: "0.5px solid rgba(162,194,208,0.4)" }}>
                        #{selectedPedido.numPedido}
                      </span>
                    )}
                  </div>
                  {/* Status badges inline under name */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {selectedPedido.estado && (
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700,
                        background: ESTADOS[selectedPedido.estado]?.bg || "#F0F0F0",
                        color: ESTADOS[selectedPedido.estado]?.color || "#8B8B8B",
                        border: `0.5px solid ${ESTADOS[selectedPedido.estado]?.color || "#8B8B8B"}22`,
                      }}>{ESTADOS[selectedPedido.estado]?.icon} {ESTADOS[selectedPedido.estado]?.label || selectedPedido.estado}</span>
                    )}
                    <button title={selectedPedido.pagado ? "Desmarcar como pagado" : "Marcar como pagado"} onClick={() => requestPagadoChange(selectedPedido)}
                      style={{ fontSize: 9, padding: "1px 6px", borderRadius: 10, fontWeight: 700, cursor: "pointer", border: "none", transition: "all 0.2s",
                        background: selectedPedido.pagado ? "#E1F2FC" : "rgba(162,194,208,0.15)",
                        color: selectedPedido.pagado ? "#3D5655" : "#A2C2D0",
                        outline: selectedPedido.pagado ? "1.5px solid rgba(79,104,103,0.25)" : "1px solid rgba(162,194,208,0.3)",
                      }}>{selectedPedido.pagado ? "PAGADO" : "€"}</button>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  {pedidoFromFicha && (
                    <button title="Volver a ficha de cliente" onClick={() => { setSelectedPedido(null); setEditingFecha(null); setConfirmCancel(null); setEditingProductos(false); setEditLineas([]); setEditSearchProd(""); setPedidoFromFicha(false); }} style={{
                      border: "none", background: "#E1F2FC", cursor: "pointer",
                      fontSize: 11, color: "#4F6867", fontWeight: 600, padding: "5px 10px",
                      borderRadius: 8, fontFamily: "'Roboto Condensed', sans-serif",
                    }}>← Cliente</button>
                  )}
                  <button title="Cerrar detalle" onClick={() => { setSelectedPedido(null); setEditingFecha(null); setConfirmCancel(null); setEditingProductos(false); setEditLineas([]); setEditSearchProd(""); setPedidoFromFicha(false); }} style={{
                    width: 32, height: 32, border: "none", borderRadius: 10,
                    background: "rgba(162,194,208,0.15)", cursor: "pointer",
                    fontSize: 16, color: "#A2C2D0", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>×</button>
                </div>
              </div>

              {/* ═══ INFO SECTION: Date + Phone ═══ */}
              <div style={{
                background: "rgba(239,233,228,0.5)", borderRadius: 14, padding: "10px 14px",
                marginBottom: 12, border: "1px solid rgba(162,194,208,0.12)",
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedPedido.fecha && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <I.Cal s={14} />
                      <span style={{ color: "#4F6867" }}>{fmt.date(selectedPedido.fecha)}</span>
                      {(selectedPedido.hora || fmt.time(selectedPedido.fecha)) && (
                        <span style={{ color: "#1B1C39", fontWeight: 600 }}>
                          {selectedPedido.hora || fmt.time(selectedPedido.fecha)}
                        </span>
                      )}
                    </div>
                  )}
                  {(selectedPedido.telefono || selectedPedido.tel) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <I.Phone s={14} />
                      <span onClick={(e) => openPhoneMenu(selectedPedido.telefono || selectedPedido.tel, e)} style={{ color: "#1B1C39", cursor: "pointer" }}>
                        {selectedPedido.telefono || selectedPedido.tel}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ PRODUCTS SECTION ═══ */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {editingProductos ? (
                  <div style={{ background: "#F5F5F5", borderRadius: 10, padding: "10px 14px" }}>
                    <p style={{ fontSize: 10, color: "#4F6867", margin: "0 0 8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Modificar productos
                    </p>
                    {/* Search to add product */}
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#A2C2D0", pointerEvents: "none" }}><I.Search s={14} /></div>
                      <input placeholder="Buscar producto..." value={editSearchProd}
                        onChange={e => setEditSearchProd(e.target.value)}
                        style={{ width: "100%", padding: "8px 8px 8px 32px", borderRadius: 8, border: "1.5px solid #A2C2D0", fontSize: 12, background: "#fff", color: "#1B1C39", outline: "none", boxSizing: "border-box" }} />
                      {editProductosFiltrados.length > 0 && (
                        <div style={{ position: "absolute", left: 0, right: 0, top: "100%", background: "rgba(239,233,228,0.88)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 10, maxHeight: 180, overflowY: "auto", marginTop: 2, padding: 3, animation: "popoverIn 0.15s ease-out" }}>
                          <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(162,194,208,0.25)" }}>
                            {editProductosFiltrados.slice(0, 8).map(p => (
                              <button key={p.nombre} onClick={() => addEditProducto(p)}
                                style={{ width: "100%", padding: "9px 12px", border: "none", borderBottom: "1px solid rgba(162,194,208,0.15)", background: "transparent", cursor: "pointer", textAlign: "left", fontSize: 12, display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                <span style={{ color: "#4F6867", fontWeight: 700 }}>+</span>
                                <span style={{ flex: 1, color: "#1B1C39" }}>{p.nombre}</span>
                                <span style={{ fontSize: 10, color: "#A2C2D0" }}>{p.precio.toFixed(2)}€</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Editable lines */}
                    {editLineas.length === 0 && (
                      <p style={{ fontSize: 12, color: "#A2C2D0", textAlign: "center", margin: "12px 0" }}>Sin productos. Busca para añadir.</p>
                    )}
                    {editLineas.map((l, i) => (
                      <div key={l.nombre} style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 0",
                        borderBottom: i < editLineas.length - 1 ? "1px solid #E1F2FC" : "none",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#1B1C39", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nombre}</div>
                          {l.precio > 0 && <div style={{ fontSize: 10, color: "#4F6867" }}>{l.precio.toFixed(2)}€/ud</div>}
                        </div>
                        <div style={{ display: "flex", background: "#E1F2FC", borderRadius: 8 }}>
                          <button onClick={() => updateEditQty(l.nombre, -1)}
                            style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#4F6867", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <I.Minus s={12} />
                          </button>
                          <NumberFlow value={l.cantidad} format={{ useGrouping: false }}
                            style={{ width: 24, textAlign: "center", lineHeight: "28px", fontSize: 13, fontWeight: 700, color: "#1B1C39" }} willChange />
                          <button onClick={() => updateEditQty(l.nombre, 1)}
                            style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#4F6867", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <I.Plus s={12} />
                          </button>
                        </div>
                        <button onClick={() => setEditLineas(ls => ls.filter(x => x.nombre !== l.nombre))}
                          style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", color: "#C62828", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <I.Trash s={13} />
                        </button>
                      </div>
                    ))}
                    {/* Save / Cancel */}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button onClick={() => guardarModificacion(selectedPedido, editLineas)}
                        style={{ flex: 1, padding: "9px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #4F6867, #3D5655)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Guardar cambios
                      </button>
                      <button onClick={() => { setEditingProductos(false); setEditLineas([]); setEditSearchProd(""); }}
                        style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #A2C2D0", background: "transparent", color: "#A2C2D0", fontSize: 12, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      background: "rgba(239,233,228,0.5)", borderRadius: 14, padding: "10px 14px",
                      border: "1px solid rgba(162,194,208,0.12)",
                    }}>
                      <p style={{ fontSize: 10, color: "#4F6867", margin: "0 0 8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Productos del pedido
                      </p>
                      {selectedPedido.productos && Array.isArray(selectedPedido.productos) && selectedPedido.productos.length > 0 ? (
                        <>
                          {selectedPedido.productos.map((item, i) => {
                            const precio = PRICE_MAP[(item.nombre || "").toLowerCase().trim()] || 0;
                            return (
                              <div key={i} style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "7px 0",
                                borderBottom: i < selectedPedido.productos.length - 1 ? "1px solid rgba(162,194,208,0.15)" : "none",
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontSize: 13, color: "#1B1C39", fontWeight: 500 }}>{item.nombre}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  {precio > 0 && <span style={{ fontSize: 11, color: "#A2C2D0" }}>{(precio * (item.unidades || 0)).toFixed(2)}€</span>}
                                  <span style={{
                                    fontSize: 11, fontWeight: 700, color: "#4F6867",
                                    background: "#E1F2FC", padding: "2px 8px", borderRadius: 6,
                                  }}>×{item.unidades}</span>
                                </div>
                              </div>
                            );
                          })}
                          {(() => {
                            const total = (selectedPedido.productos || []).reduce((s, item) => {
                              const precio = PRICE_MAP[(item.nombre || "").toLowerCase().trim()] || 0;
                              return s + precio * (item.unidades || 0);
                            }, 0);
                            return total > 0 ? (
                              <div style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                paddingTop: 8, marginTop: 4, borderTop: "1px solid rgba(79,104,103,0.15)",
                              }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#4F6867", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total</span>
                                <span style={{ fontSize: 16, fontWeight: 800, color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif" }}>{total.toFixed(2)}€</span>
                              </div>
                            ) : null;
                          })()}
                        </>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "2px 0" }}>
                          {[1, 2, 3].map(n => (
                            <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ width: `${55 + n * 12}px`, height: 12, borderRadius: 4, background: "#A2C2D0", animation: "skeletonPulse 1.2s ease-in-out infinite", animationDelay: `${n * 0.15}s` }} />
                              <div style={{ width: 32, height: 12, borderRadius: 4, background: "#A2C2D0", animation: "skeletonPulse 1.2s ease-in-out infinite", animationDelay: `${n * 0.15 + 0.1}s` }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => {
                      const initial = (selectedPedido.productos || []).map(p => {
                        const cat = catalogo.find(c => c.nombre.toLowerCase().trim() === (p.nombre || "").toLowerCase().trim());
                        return { nombre: p.nombre, cantidad: p.unidades || p.cantidad || 1, precio: cat?.precio || 0, cat: cat?.cat || "" };
                      });
                      setEditLineas(initial);
                      setEditingProductos(true);
                    }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(162,194,208,0.25)", background: "transparent", color: "#4F6867", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(225,242,252,0.5)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <I.Edit s={13} /> Modificar pedido
                    </button>
                  </>
                )}

                {editingNotas?.pedidoId === selectedPedido.id ? (
                  <div style={{ padding: "10px 14px", background: "rgba(239,233,228,0.5)", borderRadius: 12, border: "1.5px solid #A2C2D0" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#A2C2D0", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Notas</span>
                    <textarea
                      autoFocus
                      value={editingNotas.newNotas}
                      onChange={e => setEditingNotas(en => ({ ...en, newNotas: e.target.value }))}
                      placeholder="Escribe una nota..."
                      rows={3}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #A2C2D0", fontSize: 12, fontFamily: "Inter, sans-serif", resize: "vertical", background: "#fff", color: "#1B1C39", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => cambiarNotas(selectedPedido, editingNotas.newNotas)}
                        style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #4F6867, #3D5655)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Guardar
                      </button>
                      <button onClick={() => setEditingNotas(null)}
                        style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #A2C2D0", background: "transparent", color: "#A2C2D0", fontSize: 12, cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : selectedPedido.notas ? (
                  <div onClick={() => setEditingNotas({ pedidoId: selectedPedido.id, newNotas: selectedPedido.notas || "" })}
                    style={{ fontSize: 12, color: "#1B1C39", fontStyle: "italic", padding: "10px 14px", background: "rgba(239,233,228,0.5)", borderRadius: 12, overflowWrap: "break-word", wordBreak: "break-word", border: "1px solid rgba(162,194,208,0.12)", cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#A2C2D0"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(162,194,208,0.12)"}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#A2C2D0", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontStyle: "normal" }}>Notas</span>
                    {selectedPedido.notas}
                  </div>
                ) : null}

                {/* ═══ ESTADO CHANGE ═══ */}
                {(ESTADO_TRANSITIONS[selectedPedido.estado] || []).length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {(ESTADO_TRANSITIONS[selectedPedido.estado] || []).map((est, i) => {
                      const cfg = ESTADOS[est];
                      const isPrimary = i === 0; // First transition is the primary/next logical step
                      return (
                        <button className="estado-btn" key={est} onClick={() => {
                          requestEstadoChange(selectedPedido, est);
                        }}
                          style={isPrimary ? {
                            padding: "10px 18px", borderRadius: 12,
                            border: `1.5px solid ${cfg?.color || "#A2C2D0"}50`,
                            background: `linear-gradient(135deg, ${cfg?.color || "#4F6867"}ee, ${cfg?.color || "#4F6867"}cc)`,
                            color: "#fff",
                            fontSize: 13, fontWeight: 700, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6,
                            boxShadow: `0 3px 12px ${cfg?.color || "#4F6867"}35, 0 1px 3px ${cfg?.color || "#4F6867"}20`,
                          } : {
                            padding: "9px 14px", borderRadius: 12,
                            border: `1.5px solid ${cfg?.color || "#A2C2D0"}30`,
                            background: `linear-gradient(135deg, ${cfg?.bg || "#F0F0F0"}, ${cfg?.bg || "#F0F0F0"}dd)`,
                            color: cfg?.color || "#4F6867",
                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 5,
                            boxShadow: `0 2px 6px ${cfg?.color || "#4F6867"}12`,
                          }}>
                          <div className="btn-shimmer" style={!isPrimary ? { background: `linear-gradient(90deg, transparent 0%, ${cfg?.color || "#4F6867"}15 50%, transparent 100%)` } : undefined} />
                          {isPrimary && <div className="btn-glow" style={{ background: `radial-gradient(circle at 50% 50%, ${cfg?.color || "#4F6867"}30, transparent 70%)` }} />}
                          <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 5 }}>
                            {isPrimary ? (ESTADO_ACTION[est] || cfg?.label || est) : (<><span style={{ fontSize: 13 }}>{cfg?.icon}</span> {cfg?.label || est}</>)}
                            {isPrimary && (
                              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" style={{ width: 13, height: 13, opacity: 0.7 }}>
                                <path d="M9 5l7 7-7 7" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                              </svg>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* ═══ ACTIONS SECTION ═══ */}
                <div style={{ borderTop: "1px solid rgba(162,194,208,0.15)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  <a href={`https://www.notion.so/${selectedPedido.id.replace(/-/g, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, textDecoration: "none", color: "#4F6867", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(225,242,252,0.5)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <I.Ext s={15} /> Ver en Notion
                  </a>

                  {editingFecha?.pedidoId === selectedPedido.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                      <input type="date" lang="es" value={editingFecha.newFecha}
                        onChange={e => setEditingFecha(ef => ({ ...ef, newFecha: e.target.value }))}
                        style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #A2C2D0", fontSize: 13, fontFamily: "'Roboto Condensed', sans-serif" }} />
                      <button onClick={() => cambiarFechaPedido(selectedPedido, editingFecha.newFecha)}
                        style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #4F6867, #3D5655)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Guardar
                      </button>
                      <button onClick={() => setEditingFecha(null)}
                        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #A2C2D0", background: "transparent", color: "#A2C2D0", fontSize: 12, cursor: "pointer" }}>
                        ×
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingFecha({ pedidoId: selectedPedido.id, newFecha: (selectedPedido.fecha || "").split("T")[0] || fmt.todayISO() })}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "none", background: "transparent", color: "#4F6867", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "100%", transition: "background 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(225,242,252,0.5)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <I.Cal s={15} /> Cambiar fecha de entrega
                    </button>
                  )}

                  <button onClick={() => setEditingNotas({ pedidoId: selectedPedido.id, newNotas: selectedPedido.notas || "" })}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "none", background: "transparent", color: "#4F6867", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "100%", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(225,242,252,0.5)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ fontSize: 14 }}>📝</span> {selectedPedido.notas ? "Editar notas" : "Añadir notas"}
                  </button>

                  <div style={{ height: 1, background: "rgba(162,194,208,0.12)", margin: "2px 12px" }} />

                  {confirmCancel === selectedPedido.id ? (
                    <div style={{ background: "#FDE8E5", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "popoverIn 0.15s ease-out" }}>
                      <span style={{ fontSize: 13, color: "#C62828", fontWeight: 600 }}>¿Cancelar?</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => cancelarPedido(selectedPedido)}
                          style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "#C62828", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Sí, cancelar
                        </button>
                        <button onClick={() => setConfirmCancel(null)}
                          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #C62828", background: "transparent", color: "#C62828", fontSize: 12, cursor: "pointer" }}>
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmCancel(selectedPedido.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "none", background: "transparent", color: "#C62828", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "100%", transition: "background 0.15s", opacity: 0.7 }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(253,232,229,0.5)"; e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.7"; }}>
                      Cancelar pedido
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            ESTADO PICKER POPOVER
        ══════════════════════════════════════════ */}
        {estadoPicker && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => setEstadoPicker(null)}>
            <div style={{
              position: "absolute",
              left: Math.min(Math.max(estadoPicker.x - 100, 10), window.innerWidth - 220),
              top: Math.min(estadoPicker.y, window.innerHeight - 250),
              background: "rgba(239,233,228,0.92)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderRadius: 16, padding: 4,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              minWidth: 200,
              animation: "popoverIn 0.18s ease-out",
            }} onClick={e => e.stopPropagation()}>
              <div style={{
                background: "rgba(255,255,255,0.95)",
                borderRadius: 14, overflow: "hidden",
                border: "1px solid rgba(162,194,208,0.25)",
              }}>
                {(ESTADO_TRANSITIONS[estadoPicker.currentEstado] || []).map((est, i, arr) => {
                  const cfg = ESTADOS[est];
                  return (
                    <button key={est} onClick={() => {
                      const pedido = pedidos.find(p => p.id === estadoPicker.pedidoId) || { id: estadoPicker.pedidoId, fecha: "", tel: "", cliente: "" };
                      requestEstadoChange(pedido, est);
                    }}
                      style={{
                        width: "100%", padding: "12px 14px",
                        border: "none",
                        borderBottom: i < arr.length - 1 ? "1px solid rgba(162,194,208,0.15)" : "none",
                        background: "transparent", cursor: "pointer",
                        textAlign: "left", fontSize: 13, fontWeight: 600,
                        color: cfg?.color || "#4F6867",
                        display: "flex", alignItems: "center", gap: 8,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = cfg?.bg || "#F0F0F0"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: cfg?.color || "#8B8B8B", display: "inline-block", flexShrink: 0,
                      }} />
                      {cfg?.label || est}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            CONFIRM ESTADO CHANGE
        ══════════════════════════════════════════ */}
        {pendingEstadoChange && (() => {
          const cfg = ESTADOS[pendingEstadoChange.nuevoEstado];
          return (
            <div style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(27,28,57,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setPendingEstadoChange(null)}>
              <div style={{
                background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                borderRadius: 20, padding: "28px 24px 20px", maxWidth: 320, width: "90%",
                boxShadow: "0 12px 40px rgba(0,0,0,0.18)", textAlign: "center",
                animation: "popoverIn 0.18s ease-out",
              }} onClick={e => e.stopPropagation()}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: `${cfg?.color || "#4F6867"}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px", fontSize: 22,
                }}>
                  {cfg?.icon || "?"}
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#1B1C39", margin: "0 0 6px", fontFamily: "'Roboto Condensed', sans-serif" }}>
                  ¿Cambiar estado?
                </p>
                <p style={{ fontSize: 13, color: "#4F6867", margin: "0 0 20px" }}>
                  {pendingEstadoChange.isBulk
                    ? <>{pendingEstadoChange.pedido ? "" : `${bulkSelected.size} pedido${bulkSelected.size > 1 ? "s" : ""}`} → <strong style={{ color: cfg?.color }}>{cfg?.label || pendingEstadoChange.nuevoEstado}</strong></>
                    : <>{pendingEstadoChange.pedido?.cliente || pendingEstadoChange.pedido?.titulo || "Pedido"} → <strong style={{ color: cfg?.color }}>{cfg?.label || pendingEstadoChange.nuevoEstado}</strong></>
                  }
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setPendingEstadoChange(null)}
                    style={{
                      flex: 1, padding: "11px 0", borderRadius: 12,
                      border: "1.5px solid rgba(162,194,208,0.3)", background: "transparent",
                      color: "#4F6867", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}>
                    Cancelar
                  </button>
                  <button onClick={confirmarCambioEstado}
                    style={{
                      flex: 1, padding: "11px 0", borderRadius: 12,
                      border: "none",
                      background: `linear-gradient(135deg, ${cfg?.color || "#4F6867"}ee, ${cfg?.color || "#4F6867"}cc)`,
                      color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'Roboto Condensed', sans-serif",
                      boxShadow: `0 3px 12px ${cfg?.color || "#4F6867"}35`,
                    }}>
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════
            CONFIRM PAGADO CHANGE
        ══════════════════════════════════════════ */}
        {pendingPagadoChange && (() => {
          const willPay = !pendingPagadoChange.pedido?.pagado;
          return (
            <div style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(27,28,57,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setPendingPagadoChange(null)}>
              <div style={{
                background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                borderRadius: 20, padding: "28px 24px 20px", maxWidth: 320, width: "90%",
                boxShadow: "0 12px 40px rgba(0,0,0,0.18)", textAlign: "center",
                animation: "popoverIn 0.18s ease-out",
              }} onClick={e => e.stopPropagation()}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: willPay ? "#E1F2FC" : "rgba(162,194,208,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px", fontSize: 22, color: willPay ? "#3D5655" : "#A2C2D0",
                }}>
                  €
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#1B1C39", margin: "0 0 6px", fontFamily: "'Roboto Condensed', sans-serif" }}>
                  {willPay ? "¿Marcar como pagado?" : "¿Desmarcar como pagado?"}
                </p>
                <p style={{ fontSize: 13, color: "#4F6867", margin: "0 0 20px" }}>
                  {pendingPagadoChange.pedido?.cliente || pendingPagadoChange.pedido?.nombre || "Pedido"} → <strong style={{ color: willPay ? "#2E7D32" : "#C62828" }}>{willPay ? "Pagado" : "No pagado"}</strong>
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setPendingPagadoChange(null)}
                    style={{
                      flex: 1, padding: "11px 0", borderRadius: 12,
                      border: "1.5px solid rgba(162,194,208,0.3)", background: "transparent",
                      color: "#4F6867", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}>
                    Cancelar
                  </button>
                  <button onClick={confirmarPagadoChange}
                    style={{
                      flex: 1, padding: "11px 0", borderRadius: 12,
                      border: "none",
                      background: willPay ? "linear-gradient(135deg, #2E7D32ee, #2E7D32cc)" : "linear-gradient(135deg, #C62828ee, #C62828cc)",
                      color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'Roboto Condensed', sans-serif",
                      boxShadow: willPay ? "0 3px 12px #2E7D3235" : "0 3px 12px #C6282835",
                    }}>
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══════════════════════════════════════════
            PARSE WHATSAPP ORDER MODAL
        ══════════════════════════════════════════ */}
        {showParseModal && (
          <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(27,28,57,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={() => { if (!parseLoading) { stopListening(); setShowParseModal(false); } }}>
            <div style={{
              background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderRadius: 20, padding: "24px 20px 20px", maxWidth: 480, width: "100%",
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)", animation: "popoverIn 0.2s ease-out",
              maxHeight: "85vh", overflowY: "auto",
            }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "linear-gradient(135deg, #4F6867, #1B1C39)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 3px 10px rgba(79,104,103,0.3)",
                  flexShrink: 0,
                }}>
                  <I.Clipboard s={20} c="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif" }}>Pegar pedido</div>
                  <div style={{ fontSize: 12, color: "#888" }}>Texto, imagen o dictado por voz</div>
                </div>
              </div>

              {/* Error state */}
              {parseError && (
                <div style={{ background: "#FFF3E0", border: "1px solid #E65100", borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "#E65100" }}>
                  {parseError}
                </div>
              )}

              {/* Input phase */}
              {!parseResult && (
                <div onPaste={handleParsePaste}>
                  {/* Image preview */}
                  {parseImage && (
                    <div style={{ position: "relative", marginBottom: 10, borderRadius: 12, overflow: "hidden", background: "#F8F6F3", border: "1.5px solid #E8E0D4" }}>
                      <img src={parseImage.dataUrl} alt="Captura" style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block" }} />
                      <button onClick={() => setParseImage(null)} disabled={parseLoading}
                        style={{
                          position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
                          background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", fontSize: 16,
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1,
                        }}>×</button>
                      <div style={{ padding: "6px 12px", fontSize: 11, color: "#888", background: "#F8F6F3" }}>
                        {parseImage.fileName || "Imagen pegada"}
                      </div>
                    </div>
                  )}

                  {/* Drop zone + file input (when no image) */}
                  {!parseImage && (
                    <div
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#4F6867"; }}
                      onDragLeave={e => { e.currentTarget.style.borderColor = "#A2C2D0"; }}
                      onDrop={handleParseDrop}
                      onClick={() => parseFileRef.current?.click()}
                      style={{
                        border: "2px dashed #A2C2D0", borderRadius: 12, padding: "16px 14px",
                        textAlign: "center", cursor: "pointer", marginBottom: 10,
                        background: "#F8F6F3", transition: "border-color 0.15s",
                      }}
                    >
                      <div style={{ marginBottom: 4, color: "#4F6867" }}><I.Img s={32} /></div>
                      <div style={{ fontSize: 13, color: "#4F6867", fontWeight: 600 }}>Arrastra una captura o pulsa para seleccionar</div>
                      <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Tambien puedes pegar con Cmd+V / Ctrl+V</div>
                      <input ref={parseFileRef} type="file" accept="image/*" style={{ display: "none" }}
                        onChange={e => { if (e.target.files?.[0]) handleParseImageFile(e.target.files[0]); e.target.value = ""; }} />
                    </div>
                  )}

                  {/* Mic dictation button */}
                  <button
                    onClick={toggleListening}
                    disabled={parseLoading}
                    title="Dictar con microfono"
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 14px", borderRadius: 10,
                      border: "1.5px solid #A2C2D0",
                      background: "transparent",
                      color: "#4F6867",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                      transition: "all 0.2s", marginBottom: 8, width: "100%",
                      justifyContent: "center",
                    }}
                  >
                    <I.Mic s={16} c="#4F6867" /> Dictar (reproduce el audio y escucha)
                  </button>

                  {/* Textarea (always visible — optional context when image present) */}
                  <textarea
                    value={parseText}
                    onChange={e => setParseText(e.target.value)}
                    placeholder={parseImage ? "Contexto adicional (opcional)..." : "O pega aqui el texto del mensaje..."}
                    rows={parseImage ? 3 : 6}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 12,
                      border: "1.5px solid #E8E0D4", fontSize: 14, background: "#EFE9E4",
                      outline: "none", resize: "vertical", fontFamily: "Inter, sans-serif",
                      lineHeight: 1.5, boxSizing: "border-box",
                    }}
                    onFocus={e => { e.target.style.borderColor = "#4F6867"; }}
                    onBlur={e => { e.target.style.borderColor = "#E8E0D4"; }}
                    disabled={parseLoading}
                    autoFocus={!parseImage}
                  />
                  <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
                    <button onClick={() => { stopListening(); setShowParseModal(false); }} disabled={parseLoading}
                      style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid #ccc", background: "transparent", color: "#666", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      Cancelar
                    </button>
                    <button onClick={handleParseOrder} disabled={(!parseText.trim() && !parseImage) || parseLoading}
                      style={{
                        padding: "10px 22px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                        background: (!parseText.trim() && !parseImage) || parseLoading ? "#A2C2D0" : "linear-gradient(135deg, #4F6867, #1B1C39)",
                        color: "#fff", display: "flex", alignItems: "center", gap: 8,
                        fontFamily: "'Roboto Condensed', sans-serif",
                        boxShadow: (!parseText.trim() && !parseImage) || parseLoading ? "none" : "0 3px 12px rgba(79,104,103,0.35)",
                        transition: "all 0.2s",
                      }}>
                      {parseLoading ? (
                        <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> Analizando...</>
                      ) : "Analizar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Result preview phase */}
              {parseResult && (
                <>
                  {/* Confidence badge */}
                  <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                      background: parseResult.confidence === "high" ? "#E8F5E9" : parseResult.confidence === "medium" ? "#FFF3E0" : "#FFEBEE",
                      color: parseResult.confidence === "high" ? "#2E7D32" : parseResult.confidence === "medium" ? "#E65100" : "#C62828",
                    }}>
                      {parseResult.confidence === "high" ? "Alta confianza" : parseResult.confidence === "medium" ? "Confianza media" : "Baja confianza"}
                    </span>
                  </div>

                  {/* Detected info */}
                  <div style={{ background: "#F8F6F3", borderRadius: 12, padding: "12px 14px", marginBottom: 12, fontSize: 13 }}>
                    {parseResult.cliente && (
                      <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cliente:</span>
                        <strong>{parseResult.cliente}</strong>
                        {parseResult.clienteExiste ? (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: "#2E7D32", color: "#fff" }}>EN BD</span>
                        ) : (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: "#E65100", color: "#fff" }}>NUEVO</span>
                        )}
                      </div>
                    )}
                    {parseResult.telefono && (
                      <div style={{ marginBottom: 6 }}><span style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Teléfono:</span> <strong>{parseResult.telefono}</strong></div>
                    )}
                    {parseResult.fecha && (
                      <div style={{ marginBottom: 6 }}><span style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha:</span> <strong>{fmt.date(parseResult.fecha)}{parseResult.hora ? ` a las ${parseResult.hora}` : ""}</strong></div>
                    )}
                    {parseResult.notas && (
                      <div><span style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notas:</span> <strong>{parseResult.notas}</strong></div>
                    )}
                    {!parseResult.cliente && !parseResult.telefono && !parseResult.fecha && !parseResult.notas && (
                      <div style={{ color: "#888" }}>No se detectaron datos del cliente</div>
                    )}
                  </div>

                  {/* Products */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "#4F6867", fontWeight: 700, marginBottom: 8 }}>
                      Productos detectados
                    </div>
                    {parseResult.lineas.length > 0 ? parseResult.lineas.map((l, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", background: l.matched ? "#E8F5E9" : "#FFEBEE",
                        borderRadius: 10, marginBottom: 4, fontSize: 13,
                      }}>
                        <span style={{ fontWeight: 600 }}>{l.nombre}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700 }}>x{l.cantidad}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                            background: l.matched ? "#2E7D32" : "#C62828", color: "#fff",
                          }}>{l.matched ? "OK" : "?"}</span>
                        </span>
                      </div>
                    )) : (
                      <div style={{ color: "#888", fontSize: 13, padding: "8px 0" }}>No se detectaron productos</div>
                    )}
                  </div>

                  {/* Warnings */}
                  {parseResult.warnings?.length > 0 && (
                    <div style={{ background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "#F57F17" }}>
                      {parseResult.warnings.map((w, i) => (
                        <div key={i} style={{ marginBottom: i < parseResult.warnings.length - 1 ? 4 : 0, display: "flex", alignItems: "center", gap: 6 }}>
                          <I.AlertTri s={13} c="#F57F17" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => { setParseResult(null); setParseError(null); }}
                      style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid #ccc", background: "transparent", color: "#666", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      Volver
                    </button>
                    <button onClick={() => aplicarParseo(parseResult)}
                      disabled={parseResult.lineas.filter(l => l.matched).length === 0}
                      style={{
                        padding: "10px 22px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                        background: parseResult.lineas.filter(l => l.matched).length === 0 ? "#A2C2D0" : "linear-gradient(135deg, #4F6867, #1B1C39)",
                        color: "#fff", fontFamily: "'Roboto Condensed', sans-serif",
                        boxShadow: parseResult.lineas.filter(l => l.matched).length === 0 ? "none" : "0 3px 12px rgba(79,104,103,0.35)",
                        transition: "all 0.2s",
                      }}>
                      Aplicar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            LISTENING POPUP (fullscreen overlay with waveform)
        ══════════════════════════════════════════ */}
        {isListening && (
          <div className="listen-overlay" style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: "rgba(27,28,57,0.75)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 24, animation: "popoverIn 0.25s ease-out",
          }}>
            {/* Mic icon with animated ring */}
            <div className="listen-ring" style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20, position: "relative",
            }}>
              <div className="listen-ring-pulse" style={{
                position: "absolute", inset: -8, borderRadius: "50%",
                border: "2.5px solid rgba(255,255,255,0.25)",
              }} />
              <I.Mic s={36} c="#fff" />
            </div>

            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Roboto Condensed', sans-serif", marginBottom: 6, textAlign: "center" }}>
              Escuchando...
            </div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 20, textAlign: "center" }}>
              Reproduce el audio de WhatsApp cerca del microfono
            </div>

            {/* Error shown inside popup (not behind it) */}
            {listenError && (
              <div style={{
                background: "rgba(198,40,40,0.25)", border: "1px solid rgba(198,40,40,0.5)",
                borderRadius: 12, padding: "10px 16px", maxWidth: 340, width: "100%",
                color: "#ffcccc", fontSize: 13, lineHeight: 1.5,
                marginBottom: 16, textAlign: "center",
              }}>
                {listenError}
              </div>
            )}

            {/* CSS equalizer bars */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 48, marginBottom: 16 }}>
              {[0, 0.15, 0.3, 0.05, 0.25, 0.4, 0.1, 0.35].map((d, i) => (
                <div key={i} className="eq-bar" style={{ width: 4, borderRadius: 2, background: "rgba(255,255,255,0.6)", animationDelay: `${d}s` }} />
              ))}
            </div>

            {/* Live transcript preview */}
            {listenText && (
              <div style={{
                background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "10px 16px",
                maxWidth: 340, width: "100%", maxHeight: 100, overflowY: "auto",
                color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.5,
                marginBottom: 16, textAlign: "center",
              }}>
                {listenText.length > 150 ? "..." + listenText.slice(-150) : listenText}
              </div>
            )}

            {/* Stop button */}
            <button onClick={stopListening} style={{
              padding: "12px 32px", borderRadius: 14, border: "2px solid rgba(255,255,255,0.3)",
              background: "rgba(198,40,40,0.85)", color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Roboto Condensed', sans-serif",
              boxShadow: "0 4px 20px rgba(198,40,40,0.4)",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.2s",
            }}>
              <I.Mic s={18} c="#fff" /> Parar
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            WHATSAPP LISTO PROMPT
        ══════════════════════════════════════════ */}
        {whatsappPrompt && (
          <div style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(27,28,57,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setWhatsappPrompt(null)}>
            <div style={{
              background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderRadius: 20, padding: "28px 24px 20px", maxWidth: 320, width: "90%",
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)", textAlign: "center",
              animation: "popoverIn 0.2s ease-out",
            }} onClick={e => e.stopPropagation()}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #25D366, #128C7E)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", boxShadow: "0 3px 10px rgba(37,211,102,0.3)" }}><I.Phone s={24} c="#fff" /></div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1B1C39", marginBottom: 6 }}>¿Avisar al cliente?</div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 20, lineHeight: 1.4 }}>
                Se abrirá WhatsApp para enviar un mensaje a <strong>{whatsappPrompt.nombre}</strong>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setWhatsappPrompt(null)}
                  style={{ padding: "10px 22px", borderRadius: 12, border: "1px solid #ccc", background: "transparent", color: "#666", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  No
                </button>
                <button onClick={() => {
                  const tel = whatsappPrompt.tel.replace(/\D/g, "");
                  const num = tel.startsWith("34") ? tel : `34${tel}`;
                  const msg = encodeURIComponent("¡Hola! Tu pedido de Vynia ya está listo para que pases a recogerlo.");
                  window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
                  setWhatsappPrompt(null);
                }}
                  style={{ padding: "10px 22px", borderRadius: 12, border: "none", background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  Sí, avisar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            PHONE MENU: LLAMAR / WHATSAPP
        ══════════════════════════════════════════ */}
        {phoneMenu && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 300,
          }} onClick={() => setPhoneMenu(null)}>
            <div style={{
              position: "absolute",
              left: Math.min(phoneMenu.x - 105, window.innerWidth - 220),
              top: phoneMenu.y,
              background: "rgba(239,233,228,0.88)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderRadius: 16, padding: 4,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)",
              minWidth: 210,
              animation: "popoverIn 0.18s ease-out",
            }} onClick={e => e.stopPropagation()}>
              <div style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                borderRadius: 14, padding: 4,
                border: "1px solid rgba(162,194,208,0.25)",
                boxShadow: "0 0 0 0.5px rgba(0,0,0,0.04)",
              }}>
                <a href={`tel:${phoneMenu.tel}`} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                  borderRadius: 10, textDecoration: "none", color: "#1B1C39",
                  fontSize: 14, fontWeight: 600, transition: "background 0.15s",
                }} onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => setPhoneMenu(null)}>
                  <I.Phone s={16} /> Llamar
                </a>
                <div style={{ height: 1, background: "rgba(162,194,208,0.2)", margin: "2px 12px" }} />
                <a href={waLink(phoneMenu.tel)} target="_blank" rel="noopener noreferrer" style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                  borderRadius: 10, textDecoration: "none", color: "#25D366",
                  fontSize: 14, fontWeight: 600, transition: "background 0.15s",
                }} onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={() => setPhoneMenu(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}
        {/* ══════════════════════════════════════════
            HELP OVERLAY — Bento Grid + Animated List
        ══════════════════════════════════════════ */}
        {showHelp && (() => {
          const activeCat = HELP_CONTENT.find(c => c.id === helpActiveCategory);
          const toggleSection = (key) => {
            setHelpExpanded(prev => {
              const next = new Set(prev);
              next.has(key) ? next.delete(key) : next.add(key);
              return next;
            });
          };
          const BENTO_COLORS = {
            pedidos: { bg: "linear-gradient(135deg, #E1F2FC 0%, #d0e8f7 100%)", accent: "#1565C0", border: "rgba(21,101,192,0.15)" },
            nuevo: { bg: "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)", accent: "#2E7D32", border: "rgba(46,125,50,0.15)" },
            produccion: { bg: "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)", accent: "#E65100", border: "rgba(230,81,0,0.15)" },
            seguimiento: { bg: "linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)", accent: "#7B1FA2", border: "rgba(123,31,162,0.15)" },
            general: { bg: "linear-gradient(135deg, #EFE9E4 0%, #E0D6CC 100%)", accent: "#4F6867", border: "rgba(79,104,103,0.15)" },
          };
          return (
            <div data-help-overlay style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(27,28,57,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
              onClick={() => setShowHelp(false)}>
              <div style={{
                background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 540,
                maxHeight: "92vh", display: "flex", flexDirection: "column",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
                animation: "helpSlideUp 0.28s ease-out",
              }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                  padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexShrink: 0, borderBottom: "1px solid rgba(162,194,208,0.15)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {activeCat && (
                      <button onClick={() => { setHelpActiveCategory(null); setHelpExpanded(new Set()); }} style={{
                        width: 30, height: 30, borderRadius: 8, border: "none",
                        background: "rgba(162,194,208,0.15)", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#4F6867",
                      }}><I.Back s={16} /></button>
                    )}
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif" }}>
                      {activeCat ? <><span style={{ display: "inline-flex", verticalAlign: "middle", marginRight: 6 }}>{activeCat.icon}</span>{activeCat.title}</> : "Manual de uso"}
                    </h2>
                  </div>
                  <button onClick={() => setShowHelp(false)} style={{
                    width: 32, height: 32, borderRadius: 8, border: "none",
                    background: "rgba(162,194,208,0.2)", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, color: "#4F6867", fontWeight: 700,
                  }}>✕</button>
                </div>

                {/* Scrollable content */}
                <div style={{
                  overflowY: "auto", flex: 1, padding: "16px 16px 24px",
                  paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
                }}>
                  {!activeCat ? (
                    /* ─── BENTO GRID: Category cards ─── */
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gridTemplateRows: "auto",
                      gap: 10,
                    }}>
                      {HELP_CONTENT.map((cat, ci) => {
                        const colors = BENTO_COLORS[cat.id] || BENTO_COLORS.general;
                        const isWide = ci === 0;
                        return (
                          <button key={cat.id} onClick={() => { setHelpActiveCategory(cat.id); setHelpExpanded(new Set()); }}
                            className="help-bento-card"
                            style={{
                              gridColumn: isWide ? "1 / -1" : "auto",
                              position: "relative", overflow: "hidden",
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                              borderRadius: 16, padding: isWide ? "20px 18px" : "16px 14px",
                              cursor: "pointer", textAlign: "left",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)",
                              transition: "all 0.2s ease",
                              animation: `helpItemIn 0.35s ease-out ${ci * 0.06}s both`,
                            }}>
                            <div style={{
                              width: isWide ? 40 : 34, height: isWide ? 40 : 34,
                              borderRadius: 10, background: `${colors.accent}18`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: isWide ? 20 : 17, marginBottom: isWide ? 12 : 8,
                            }}>
                              {cat.icon}
                            </div>
                            <div style={{
                              fontSize: isWide ? 15 : 13, fontWeight: 700, color: "#1B1C39",
                              fontFamily: "'Roboto Condensed', sans-serif", marginBottom: 4,
                            }}>
                              {cat.title}
                            </div>
                            <div style={{
                              fontSize: 11, color: "#4F6867", lineHeight: 1.4,
                              opacity: 0.8,
                            }}>
                              {cat.sections.length} temas
                            </div>
                            {/* Decorative gradient orb */}
                            <div style={{
                              position: "absolute", top: -20, right: -20,
                              width: isWide ? 80 : 60, height: isWide ? 80 : 60,
                              borderRadius: "50%", background: `${colors.accent}12`,
                              pointerEvents: "none",
                            }} />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* ─── ANIMATED LIST: Section items ─── */
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {activeCat.sections.map((sec, si) => {
                        const key = `${activeCat.id}-${si}`;
                        const isOpen = helpExpanded.has(key);
                        const colors = BENTO_COLORS[activeCat.id] || BENTO_COLORS.general;
                        return (
                          <div key={si}
                            className="help-list-item"
                            style={{
                              background: "#fff",
                              borderRadius: 14,
                              border: "1px solid rgba(0,0,0,0.04)",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.03)",
                              overflow: "hidden",
                              transition: "all 0.2s ease",
                              animation: `helpItemIn 0.35s ease-out ${si * 0.05}s both`,
                            }}>
                            <button onClick={() => toggleSection(key)} style={{
                              width: "100%", padding: "12px 14px", border: "none",
                              background: "transparent", cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 12,
                              textAlign: "left",
                            }}>
                              <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: `${colors.accent}12`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 15, color: colors.accent, fontWeight: 700,
                                fontFamily: "'Roboto Condensed', sans-serif",
                              }}>
                                {si + 1}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#1B1C39" }}>
                                  {sec.title}
                                </div>
                                {!isOpen && (
                                  <div style={{
                                    fontSize: 11, color: "#4F6867", opacity: 0.7,
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                    marginTop: 2,
                                  }}>
                                    {sec.content}
                                  </div>
                                )}
                              </div>
                              <span style={{
                                transition: "transform 0.2s ease",
                                transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                                color: "#A2C2D0", flexShrink: 0,
                              }}>
                                <I.Chevron />
                              </span>
                            </button>

                            {isOpen && (
                              <div style={{
                                padding: "0 14px 14px 62px", fontSize: 13,
                                color: "#4F6867", lineHeight: 1.6,
                                animation: "popoverIn 0.15s ease-out",
                              }}>
                                <p style={{ margin: "0 0 8px" }}>{sec.content}</p>

                                {sec.steps && (
                                  <ol style={{ margin: "0 0 8px", paddingLeft: 18 }}>
                                    {sec.steps.map((step, i) => (
                                      <li key={i} style={{ marginBottom: 3 }}>{step}</li>
                                    ))}
                                  </ol>
                                )}

                                {sec.tip && (
                                  <div style={{
                                    background: `${colors.accent}12`, borderLeft: `3px solid ${colors.accent}`,
                                    borderRadius: "0 10px 10px 0", padding: "8px 12px",
                                    fontSize: 12, color: "#1B1C39", lineHeight: 1.5,
                                    marginTop: 6,
                                  }}>
                                    <strong>Tip:</strong> {sec.tip}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </main>

      {/* ════ BULK ACTION BAR ════ */}
      {bulkMode && bulkSelected.size > 0 && (
        <div style={{
          position: "fixed", bottom: 68, left: "50%", transform: "translateX(-50%)",
          width: "calc(100% - 96px)",
          background: "rgba(27,28,57,0.92)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          borderRadius: 16, padding: "12px 16px",
          boxShadow: "0 -4px 24px rgba(27,28,57,0.25), 0 2px 8px rgba(0,0,0,0.1)",
          zIndex: 59,
          animation: "bulkBarIn 0.2s ease-out",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: "#fff",
              fontFamily: "'Roboto Condensed', sans-serif",
              whiteSpace: "nowrap",
            }}>
              {bulkSelected.size} seleccionado{bulkSelected.size > 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
              {bulkTransitions.map(est => {
                const cfg = ESTADOS[est];
                return (
                  <button key={est} disabled={bulkLoading} onClick={() => requestEstadoChange(null, est, { isBulk: true })}
                    style={{
                      padding: "8px 14px", borderRadius: 10,
                      border: "none",
                      background: cfg.color,
                      color: "#fff",
                      fontSize: 12, fontWeight: 700,
                      fontFamily: "'Roboto Condensed', sans-serif",
                      cursor: bulkLoading ? "wait" : "pointer",
                      opacity: bulkLoading ? 0.6 : 1,
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}>
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
              {bulkTransitions.length === 0 && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
                  Sin transiciones comunes
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ UPDATE BANNER ════ */}
      {updateAvailable && (
        <div style={{
          position: "fixed", bottom: 64, left: "50%", transform: "translateX(-50%)",
          background: "#1B1C39", color: "#fff", borderRadius: 12,
          padding: "10px 20px", display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 200,
          animation: "popoverIn 0.25s ease-out", fontSize: 13, fontWeight: 500,
          fontFamily: "'Roboto Condensed', sans-serif",
        }}>
          Nueva versión disponible
          <button onClick={() => window.location.reload()} style={{
            padding: "6px 14px", borderRadius: 8, border: "none",
            background: "#4F6867", color: "#fff", fontSize: 12,
            fontWeight: 700, cursor: "pointer",
          }}>Actualizar</button>
          <button onClick={() => setUpdateAvailable(false)} style={{
            background: "none", border: "none", color: "#A2C2D0",
            fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1,
          }}>✕</button>
        </div>
      )}

      {/* ════ BOTTOM NAV ════ */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0,
        width: "100%",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid #A2C2D0",
        display: "flex", padding: "8px 0 env(safe-area-inset-bottom, 8px)",
        zIndex: 60,
      }}>
        {[
          { key: "pedidos", icon: <I.ClipboardList s={22} />, label: "Pedidos", tip: "Ver lista de pedidos" },
          { key: "nuevo", icon: <I.Plus s={22} />, label: "Nuevo", tip: "Crear nuevo pedido" },
          { key: "produccion", icon: <I.ChefHat s={22} />, label: "Producción", tip: "Ver producción diaria" },
        ].map(t => (
          <button title={t.tip} key={t.key} onClick={() => { setTab(t.key); setCreateResult(null); if (t.key === "nuevo") resetForm(); if (t.key !== "pedidos") { setBusqueda(""); setBulkMode(false); setBulkSelected(new Set()); } if (t.key === "produccion" && produccionData.length === 0) loadProduccion(); }}
            style={{
              flex: 1, padding: "6px 0", border: "none",
              background: "transparent", cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 2,
              color: tab === t.key ? "#4F6867" : "#A2C2D0",
              transition: "color 0.2s",
            }}>
            {t.key === "nuevo" ? (
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: tab === "nuevo"
                  ? "linear-gradient(135deg, #4F6867, #1B1C39)"
                  : "#E1F2FC",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: tab === "nuevo" ? "#fff" : "#4F6867",
                boxShadow: tab === "nuevo" ? "0 2px 10px rgba(166,119,38,0.3)" : "none",
                marginTop: -20,
                border: "3px solid #fff",
              }}>
                {t.icon}
              </div>
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: tab === t.key ? "#E1F2FC" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: tab === t.key ? "#4F6867" : "#A2C2D0",
                transition: "all 0.25s",
              }}>
                {t.icon}
              </div>
            )}
            <span style={{
              fontSize: 10, fontWeight: tab === t.key ? 700 : 500,
            }}>{t.label}</span>
            {tab === t.key && t.key !== "nuevo" && <span style={{
              width: 5, height: 5, borderRadius: "50%", background: "#4F6867",
              marginTop: 2, transition: "all 0.25s",
            }} />}
          </button>
        ))}
      </nav>

      {/* ════ TOOLTIP (desktop hover + mobile long-press) ════ */}
      {tooltip && (
        <div style={{
          position: "fixed",
          left: tooltip.x,
          top: tooltip.y,
          transform: tooltip.flip ? "translateX(-50%)" : "translate(-50%, -100%)",
          background: "#1B1C39",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          padding: "6px 12px",
          borderRadius: 8,
          zIndex: 9999,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          animation: tooltip.flip ? "tooltipInFlip 0.15s ease" : "tooltipIn 0.15s ease",
        }}>
          <div style={{
            position: "absolute",
            [tooltip.flip ? "top" : "bottom"]: 0,
            left: "15%", width: "70%", height: 1.5,
            background: "linear-gradient(to right, transparent, #4F6867, #A2C2D0, transparent)",
            borderRadius: 1,
          }} />
          {tooltip.text}
        </div>
      )}

      {/* ════ GLOBAL STYLES ════ */}
      <style>{`
        :root {
          --vynia-primary: #4F6867;
          --vynia-secondary: #1B1C39;
          --vynia-accent: #E1F2FC;
          --vynia-bg: #EFE9E4;
          --vynia-muted: #A2C2D0;
          --vynia-radius: 14px;
          --vynia-transition: 200ms ease;
        }
        .grid-cards {
          transition: grid-template-columns 0.3s ease;
        }
        .flow-btn:not(.flow-btn-active):hover {
          border-color: transparent !important;
          color: #fff !important;
          border-radius: 12px !important;
        }
        .flow-btn:not(.flow-btn-active):hover .flow-btn-circle {
          width: 220px !important;
          height: 220px !important;
          background: #4F6867 !important;
        }
        .flow-btn:active { transform: scale(0.95); }
        @keyframes tubelightGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn {
          from { opacity: 0; transform: translate(-50%, -12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes tooltipIn {
          from { opacity: 0; transform: translate(-50%, -100%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
        @keyframes tooltipInFlip {
          from { opacity: 0; transform: translateX(-50%) scale(0.9); }
          to { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        @keyframes popoverIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes helpSlideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes helpItemIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .help-bento-card:hover {
          transform: scale(1.03) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03) !important;
        }
        .help-bento-card:active { transform: scale(0.98) !important; }
        .help-list-item:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03) !important;
        }
        @keyframes bulkBarIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes shine-pulse {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          to { background-position: 0% 0%; }
        }
        @keyframes btnShimmer {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        .parse-btn:hover {
          box-shadow: 0 6px 20px rgba(79,104,103,0.25) !important;
          transform: translateY(-1px) scale(1.01);
          border-color: rgba(79,104,103,0.55) !important;
        }
        .parse-btn:active { transform: scale(0.97); }
        .parse-btn:hover .parse-btn-arrow {
          opacity: 0.9 !important;
          transform: translateX(2px);
        }
        .parse-btn-shine {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(162,194,208,0.3), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s ease-out;
          pointer-events: none;
        }
        .parse-btn:hover .parse-btn-shine { transform: translateX(100%); }
        @keyframes listenRingPulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .listen-ring-pulse { animation: listenRingPulse 1.8s ease-out infinite; }
        .listen-ring { animation: micBreath 2s ease-in-out infinite; }
        @keyframes micBreath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes eqBar {
          0%, 100% { height: 6px; }
          50% { height: 36px; }
        }
        .eq-bar { animation: eqBar 0.8s ease-in-out infinite; }
        .estado-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease-out;
        }
        .estado-btn:hover {
          transform: translateY(-1px) scale(1.02);
        }
        .estado-btn:active {
          transform: scale(0.96);
        }
        .estado-btn .btn-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%);
          transform: translateX(-100%);
          pointer-events: none;
        }
        .estado-btn:hover .btn-shimmer {
          animation: btnShimmer 0.8s ease-out forwards;
        }
        .estado-btn .btn-glow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .estado-btn:hover .btn-glow {
          opacity: 1;
        }
        /* Shine border effect on order cards */
        .order-card {
          position: relative;
        }
        .order-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.5px;
          background-image: radial-gradient(transparent, transparent, #4F6867, #E1F2FC, #A2C2D0, transparent, transparent);
          background-size: 300% 300%;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          animation: shine-pulse 14s infinite linear;
          will-change: background-position;
          pointer-events: none;
          z-index: 0;
        }
        .order-card > div {
          position: relative;
          z-index: 1;
        }
        @media (prefers-reduced-motion: reduce) {
          .order-card::before { animation: none; }
        }
        /* Tooltips are now JS-driven for both desktop and mobile */
        @media (hover: none) {
          [title] { -webkit-touch-callout: none; }
        }
        input:focus, textarea:focus {
          border-color: #4F6867 !important;
          box-shadow: 0 0 0 3px rgba(79,104,103,0.15) !important;
          outline: none;
        }
        button:active { transform: scale(0.97); }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #A2C2D0; border-radius: 2px; }
        input[type="date"], input[type="time"] {
          -webkit-appearance: none; appearance: none;
        }
        @media print {
          @page { margin: 12mm 10mm; size: A4; }
          body, html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #print-header { display: block !important; }
          header { display: none !important; }
          nav { display: none !important; }
          #filter-pills { display: none !important; }
          .card-actions { display: none !important; }
          .order-card { break-inside: avoid; border-color: #ccc !important; }
          .order-card::before { display: none !important; }
          * { box-shadow: none !important; animation: none !important; }
          a[href^="tel:"] { color: #1B1C39 !important; text-decoration: none !important; }
          [data-help-overlay] { display: none !important; }
          [data-surplus-section] input, [data-surplus-section] button:not([data-surplus-row]) { display: none !important; }
          [data-surplus-section] [data-surplus-stepper] { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── SHARED STYLES ───
const labelStyle = {
  fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em",
  color: "#4F6867", fontWeight: 700,
  display: "flex", alignItems: "center", gap: 5,
};

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1.5px solid #E8E0D4", fontSize: 14,
  background: "#EFE9E4", outline: "none",
  color: "#1B1C39", boxSizing: "border-box",
};
