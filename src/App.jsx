import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { notion, invalidateApiCache, invalidatePedidosCache } from "./api.js";
import { VYNIA_LOGO, VYNIA_LOGO_MD } from "./constants/brand.js";
import { CATALOGO_FALLBACK, PRICE_MAP, rebuildPriceMap } from "./constants/catalogo.js";
import { ESTADOS, ESTADO_PROGRESS, ESTADO_NEXT, ESTADO_ACTION, ESTADO_TRANSITIONS, effectiveEstado } from "./constants/estados.js";
import { fmt } from "./utils/fmt.js";
import { esTarde } from "./utils/helpers.js";
import I from "./components/Icons.jsx";
import useBreakpoint from "./hooks/useBreakpoint.js";
import EstadoGauge from "./components/EstadoGauge.jsx";
import PipelineRing from "./components/PipelineRing.jsx";
import ConfirmEstadoDialog from "./components/ConfirmEstadoDialog.jsx";
import ConfirmPagadoDialog from "./components/ConfirmPagadoDialog.jsx";
import WhatsAppPrompt from "./components/WhatsAppPrompt.jsx";
import PhoneMenuPopover from "./components/PhoneMenuPopover.jsx";
import HelpOverlay from "./components/HelpOverlay.jsx";
import OrderDetailModal from "./components/OrderDetailModal.jsx";
import TabNuevo from "./components/TabNuevo.jsx";
import TabProduccion from "./components/TabProduccion.jsx";

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
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
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

  // Produccion diaria
  const [produccionData, setProduccionData] = useState([]);
  const [produccionFecha, setProduccionFecha] = useState(fmt.todayISO());
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [phoneMenu, setPhoneMenu] = useState(null); // { tel, x, y }
  const [whatsappPrompt, setWhatsappPrompt] = useState(null); // { tel, nombre }

  // Bulk selection
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Glass calendar
  const [glassCalTarget, setGlassCalTarget] = useState(null); // null | "pedidos" | "produccion"
  const [glassCalMonth, setGlassCalMonth] = useState(null); // "YYYY-MM"
  const glassCalRef = useRef(null);

  // Refs
  const toastTimer = useRef(null);
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

  // ─── Load product catalog from Notion (source of truth) ───
  useEffect(() => {
    if (apiMode === "demo") { setCatalogo(CATALOGO_FALLBACK); return; }
    notion.loadProductos()
      .then(prods => {
        if (Array.isArray(prods) && prods.length > 0) {
          setCatalogo(prods);
          rebuildPriceMap(prods);
        }
      })
      .catch(() => { /* fallback silently */ });
  }, [apiMode]);

  // ─── Close dropdowns on click outside ───
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clienteWrapperRef.current && !clienteWrapperRef.current.contains(e.target)) {
        setSearchResults([]);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
      if (glassCalRef.current && !glassCalRef.current.contains(e.target)) {
        setGlassCalTarget(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── HEADER HEIGHT (for sticky filters on mobile) ───
  useEffect(() => {
    if (!headerRef.current) return;
    const measure = () => setHeaderH(headerRef.current.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  // ─── GLASS CALENDAR ───
  const openGlassCal = (target, currentDate) => {
    if (glassCalTarget === target) { setGlassCalTarget(null); return; }
    const month = (currentDate || fmt.todayISO()).substring(0, 7);
    setGlassCalTarget(target);
    setGlassCalMonth(month);
  };
  const glassCalNav = (delta) => {
    if (!glassCalMonth) return;
    const [y, m] = glassCalMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setGlassCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  useEffect(() => {
    if (glassCalTarget) {
      const el = document.getElementById(`gcal-sel-${glassCalTarget}`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }), 60);
    }
  }, [glassCalTarget, glassCalMonth]);
  const renderGlassCal = (target, selectedVal, onChange) => {
    if (glassCalTarget !== target || !glassCalMonth) return null;
    const [y, m] = glassCalMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthName = new Date(y, m - 1, 15).toLocaleDateString("es-ES", { month: "long" });
    const today = fmt.todayISO();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m - 1, d);
      const val = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ val, day: d, weekday: date.toLocaleDateString("es-ES", { weekday: "narrow" }).toUpperCase(), isToday: val === today, isSunday: date.getDay() === 0 });
    }
    return (
      <div ref={glassCalRef} style={{
        background: "rgba(239,233,228,0.95)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        borderRadius: 16, padding: "14px 0", border: "1px solid rgba(162,194,208,0.3)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)",
        animation: "popoverIn 0.18s ease-out", marginTop: 8, overflow: "hidden",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "0 14px" }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: "#1B1C39", textTransform: "capitalize", fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: "-0.02em" }}>{monthName}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => glassCalNav(-1)} style={{ border: "none", background: "rgba(79,104,103,0.1)", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4F6867" }}>
              <span style={{ transform: "rotate(180deg)", display: "flex" }}><I.Chevron s={12} /></span>
            </button>
            <button onClick={() => glassCalNav(1)} style={{ border: "none", background: "rgba(79,104,103,0.1)", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#4F6867" }}>
              <I.Chevron s={12} />
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", padding: "0 14px" }} className="scrollbar-hide">
          <div style={{ display: "flex", gap: 10 }}>
            {days.map(d => {
              const sel = selectedVal === d.val;
              const sundayColor = d.isSunday ? "#C62828" : undefined;
              return (
                <div key={d.val} id={sel ? `gcal-sel-${target}` : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: d.isSunday ? 6 : 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: d.isSunday ? "rgba(198,40,40,0.5)" : "#A2C2D0" }}>{d.weekday}</span>
                  <button onClick={() => { onChange(d.val); setGlassCalTarget(null); }}
                    style={{
                      width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 600, position: "relative",
                      fontFamily: "'Roboto Condensed', sans-serif",
                      background: sel ? "linear-gradient(135deg, #4F6867, #1B1C39)" : "transparent",
                      color: sel ? "#fff" : (sundayColor || "#1B1C39"),
                      boxShadow: sel ? "0 2px 12px rgba(79,104,103,0.4)" : "none",
                      transition: "all 0.2s",
                    }}>
                    {d.isToday && !sel && <span style={{ position: "absolute", bottom: 1, width: 4, height: 4, borderRadius: "50%", background: "#4F6867" }} />}
                    {d.day}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

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
      notify("ok", "Pedido cancelado");
      return;
    }
    setLoading(true);
    try {
      await notion.archivarPedido(pedido.id);
      setPedidos(ps => ps.filter(p => p.id !== pedido.id));
      invalidateProduccion(pedido.fecha); invalidateSearchCache();
      setSelectedPedido(null);
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
      notify("ok", "Fecha actualizada");
      return true;
    }
    setLoading(true);
    try {
      await notion.updatePage(pedido.id, { "Fecha entrega": { date: { start: newFecha } } });
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, fecha: newFecha, hora: "" } : p));
      invalidateProduccion(pedido.fecha); invalidateProduccion(newFecha); invalidateSearchCache();
      notify("ok", "Fecha actualizada");
      return true;
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
      notify("ok", trimmed ? "Notas actualizadas" : "Notas eliminadas");
      return true;
    }
    setLoading(true);
    try {
      await notion.updatePage(pedido.id, {
        "Notas": { rich_text: trimmed ? [{ type: "text", text: { content: trimmed } }] : [] }
      });
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, notas: trimmed } : p));
      if (selectedPedido?.id === pedido.id) setSelectedPedido(prev => prev ? { ...prev, notas: trimmed } : prev);
      invalidateSearchCache();
      notify("ok", trimmed ? "Notas actualizadas" : "Notas eliminadas");
      return true;
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

  const guardarModificacion = async (pedido, newLineas) => {
    if (newLineas.length === 0) { notify("err", "Añade al menos un producto"); return; }
    const newImporte = newLineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
    const newProdsStr = newLineas.map(l => `${l.cantidad}x ${l.nombre}`).join(", ");
    if (apiMode === "demo") {
      const newProds = newLineas.map(l => ({ nombre: l.nombre, unidades: l.cantidad }));
      setSelectedPedido(prev => prev ? { ...prev, productos: newProds } : prev);
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, importe: newImporte, productos: newProdsStr } : p));
      notify("ok", "Pedido modificado");
      return true;
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
      invalidateProduccion(pedido.fecha); invalidateSearchCache();
      notify("ok", "Pedido modificado");
      return true;
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
  const parseProductsStr = (str) => {
    if (!str || typeof str !== "string") return [];
    return str.split(",").map(s => {
      const m = s.trim().match(/^(\d+)x\s+(.+)$/);
      return m ? { nombre: m[2].trim(), unidades: parseInt(m[1], 10) } : null;
    }).filter(Boolean);
  };

  // ─── CREATE ORDER (called by TabNuevo via prop) ───
  const crearPedido = async ({ cliente, telefono, fecha, hora, pagado, notas, lineas, selectedClienteId }) => {
    if (apiMode === "demo") {
      const total = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
      const prodsStr = lineas.map(l => `${l.cantidad}x ${l.nombre}`).join(", ");
      const demoId = `demo-${Date.now()}`;
      setPedidos(ps => [{
        id: demoId, nombre: `Pedido ${cliente}`, cliente, tel: telefono,
        fecha: hora ? `${fecha}T${hora}:00` : fecha, hora,
        productos: prodsStr, importe: total, estado: "Sin empezar", pagado, notas,
      }, ...ps]);
      notify("ok", `✓ Pedido creado: ${cliente} — €${total.toFixed(2)}`);
      return { status: "ok", cliente, total, pedidoId: demoId };
    }

    setLoading(true);
    try {
      let clientePageId = selectedClienteId;
      if (!clientePageId) {
        const clienteRes = await notion.findOrCreateCliente(cliente, telefono);
        if (!clienteRes?.id) throw new Error("No se pudo crear/encontrar el cliente");
        clientePageId = clienteRes.id;
      }
      const pedidoRes = await notion.crearPedido(cliente, clientePageId, fecha, hora, pagado, notas, lineas);
      const total = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
      notify("ok", `✓ Pedido creado en Notion: ${cliente} — €${total.toFixed(2)}`);
      loadPedidos();
      invalidateProduccion(fecha); invalidateSearchCache();
      return { status: "ok", cliente, total, pedidoId: pedidoRes.id, telefono, fecha, hora, pagado, notas, lineas };
    } catch (err) {
      notify("err", "Error: " + (err.message || "").substring(0, 100));
      return { status: "err", message: err.message || "Error desconocido" };
    } finally {
      setLoading(false);
    }
  };

  const verPedidoCreado = (pedidoId, resultData) => {
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
    } else if (resultData) {
      const cr = resultData;
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

  // ─── STATS (single-pass, memoized) ───
  const { statsTotal, statsPendientes, statsRecogidos, statsPorPreparar, statsListoRecoger } = useMemo(() => {
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
      <header ref={headerRef} style={{
        background: "linear-gradient(180deg, #E1F2FC 0%, #EFE9E4 100%)",
        padding: isDesktop ? "16px 48px 12px" : "16px 20px 12px",
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid #A2C2D0",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: isDesktop ? 16 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 60, height: 60,
              background: "#ffffff",
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              border: "1px solid #A2C2D0",
            }}>
              <img src="/logo-vynia-redondo.png" alt="Vynia" style={{ width: 60, height: 60, objectFit: "cover" }} />
            </div>
            <div style={{ position: "relative" }}>
              <h1 style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontSize: 15, fontWeight: 600,
                margin: 0, color: "#4F6867", letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>Gestión de Pedidos de Vynia</h1>
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

          {/* Stats dot-cards — desktop: inline in header row */}
          {isDesktop && (
            <div style={{
              display: "flex", gap: 8, flex: 1, justifyContent: "center", maxWidth: 460,
            }}>
              {[
                { label: "Total", value: statsTotal, color: "#4F6867", filter: "todos" },
                { label: "Pendientes", value: statsPendientes, color: "#1565C0", filter: "pendientes" },
                { label: "Recogidos", value: statsRecogidos, color: "#2E7D32", filter: "recogidos" },
              ].map(s => {
                const active = filtro === s.filter && tab === "pedidos";
                return (
                <button key={s.label} className="dot-card" title={`Filtrar por ${s.label.toLowerCase()}`} onClick={() => { setTab("pedidos"); setFiltro(s.filter); }}
                  style={{
                    position: "relative", overflow: "hidden",
                    flex: 1, padding: "10px 8px", borderRadius: 14,
                    background: active ? "rgba(225,242,252,0.6)" : "rgba(239,233,228,0.45)",
                    backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                    border: active ? `1.5px solid ${s.color}55` : "1px solid rgba(162,194,208,0.25)",
                    cursor: "pointer", textAlign: "center",
                    transition: "all 0.25s",
                    boxShadow: active ? `0 2px 12px ${s.color}18` : "none",
                  }}>
                  {/* Ray gradient */}
                  <span style={{
                    position: "absolute", inset: 0, borderRadius: "inherit",
                    background: `radial-gradient(circle at 50% 0%, ${s.color}${active ? "18" : "0A"} 0%, transparent 65%)`,
                    pointerEvents: "none",
                  }} />
                  {/* Corner lines */}
                  <span style={{ position: "absolute", top: 6, left: 6, width: 10, height: 1, background: `${s.color}30`, borderRadius: 1 }} />
                  <span style={{ position: "absolute", top: 6, left: 6, width: 1, height: 10, background: `${s.color}30`, borderRadius: 1 }} />
                  <span style={{ position: "absolute", bottom: 6, right: 6, width: 10, height: 1, background: `${s.color}30`, borderRadius: 1 }} />
                  <span style={{ position: "absolute", bottom: 6, right: 6, width: 1, height: 10, background: `${s.color}30`, borderRadius: 1 }} />
                  {/* Content */}
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{
                      fontSize: 20, fontWeight: 800,
                      fontFamily: "'Roboto Condensed', sans-serif", color: s.color,
                      lineHeight: 1,
                    }}>{s.value}</div>
                    <div style={{
                      fontSize: 9, color: "#4F6867", marginTop: 3,
                      textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600,
                    }}>{s.label}</div>
                  </div>
                </button>
              );
              })}
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
                  { icon: <I.Help s={16} />, label: "Manual de uso", action: () => { setShowHelp(true); } },
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

        {/* Stats dot-cards — mobile/tablet only (desktop renders inline above) */}
        <div style={{
          display: isDesktop ? "none" : "flex", gap: 8, marginTop: 14, overflow: "auto",
          scrollbarWidth: "none", msOverflowStyle: "none",
        }}>
          {[
            { label: "Total", value: statsTotal, color: "#4F6867", filter: "todos" },
            { label: "Pendientes", value: statsPendientes, color: "#1565C0", filter: "pendientes" },
            { label: "Recogidos", value: statsRecogidos, color: "#2E7D32", filter: "recogidos" },
          ].map(s => {
            const active = filtro === s.filter && tab === "pedidos";
            return (
            <button key={s.label} className="dot-card" title={`Filtrar por ${s.label.toLowerCase()}`} onClick={() => { setTab("pedidos"); setFiltro(s.filter); }}
              style={{
                position: "relative", overflow: "hidden",
                flex: 1, padding: "12px 8px", borderRadius: 14,
                background: active ? "rgba(225,242,252,0.6)" : "rgba(239,233,228,0.45)",
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                border: active ? `1.5px solid ${s.color}55` : "1px solid rgba(162,194,208,0.25)",
                cursor: "pointer", textAlign: "center",
                transition: "all 0.25s",
                boxShadow: active ? `0 2px 12px ${s.color}18` : "none",
              }}>
              {/* Ray gradient */}
              <span style={{
                position: "absolute", inset: 0, borderRadius: "inherit",
                background: `radial-gradient(circle at 50% 0%, ${s.color}${active ? "18" : "0A"} 0%, transparent 65%)`,
                pointerEvents: "none",
              }} />
              {/* Corner lines */}
              <span style={{ position: "absolute", top: 6, left: 6, width: 12, height: 1, background: `${s.color}30`, borderRadius: 1 }} />
              <span style={{ position: "absolute", top: 6, left: 6, width: 1, height: 12, background: `${s.color}30`, borderRadius: 1 }} />
              <span style={{ position: "absolute", bottom: 6, right: 6, width: 12, height: 1, background: `${s.color}30`, borderRadius: 1 }} />
              <span style={{ position: "absolute", bottom: 6, right: 6, width: 1, height: 12, background: `${s.color}30`, borderRadius: 1 }} />
              {/* Content */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  fontFamily: "'Roboto Condensed', sans-serif", color: s.color,
                  lineHeight: 1,
                }}>{s.value}</div>
                <div style={{
                  fontSize: 10, color: "#4F6867", marginTop: 3,
                  textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600,
                }}>{s.label}</div>
              </div>
            </button>
          );
          })}
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
          <img src="/logo-loader.png" alt="" style={{ width: 56, height: 56, borderRadius: "50%", animation: "logoSpin 2s linear infinite", }} />
        </div>
      )}

      <main style={{ padding: isDesktop ? "0 48px" : "0 16px" }}>

        {/* ══════════════════════════════════════════
            TAB: PEDIDOS
        ══════════════════════════════════════════ */}
        {tab === "pedidos" && (
          <div style={{ paddingTop: 12 }}>
            {/* ── Sticky filters wrapper (mobile) ── */}
            <div style={{
              ...(!isDesktop ? {
                position: "sticky", top: headerH, zIndex: 45,
                background: "#EFE9E4",
                marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16,
                paddingTop: 2, paddingBottom: 6,
                borderBottom: "1px solid rgba(162,194,208,0.2)",
              } : {}),
            }}>
            {/* ── Date selector row ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "rgba(79,104,103,0.06)", border: "1px solid rgba(162,194,208,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderRadius: 14 }}>
                {[
                  { label: "Hoy", val: fmt.todayISO() },
                  { label: "Mañana", val: fmt.tomorrowISO() },
                  { label: "Pasado", val: fmt.dayAfterISO() },
                ].map(d => {
                  const sel = filtroFecha === d.val;
                  return (
                    <button key={d.label} title={`Ver pedidos de ${d.label.toLowerCase()}`}
                      onClick={() => { setFiltroFecha(d.val); loadPedidos(d.val); setGlassCalTarget(null); }}
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
                {(() => {
                  const isCustomDate = filtroFecha && ![fmt.todayISO(), fmt.tomorrowISO(), fmt.dayAfterISO()].includes(filtroFecha);
                  const calOpen = glassCalTarget === "pedidos";
                  const active = isCustomDate || calOpen;
                  return (
                    <button title="Seleccionar fecha" onClick={() => openGlassCal("pedidos", filtroFecha)}
                      style={{
                        position: "relative", display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10,
                        border: "none",
                        background: active ? "#E1F2FC" : "transparent",
                        color: active ? "#1B1C39" : "#4F6867",
                        fontWeight: active ? 700 : 500,
                        fontSize: 13, cursor: "pointer", transition: "all 0.25s",
                        fontFamily: "'Roboto Condensed', sans-serif",
                        boxShadow: active ? "0 1px 4px rgba(79,104,103,0.1)" : "none",
                      }}>
                      {active && <span style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", width: 24, height: 3, borderRadius: 2, background: "#4F6867", boxShadow: "0 0 8px 2px rgba(79,104,103,0.4), 0 0 20px 4px rgba(79,104,103,0.15)", animation: "tubelightGlow 2s ease-in-out infinite" }} />}
                      <I.Cal s={13} />
                      {isCustomDate ? new Date(filtroFecha + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "Fecha"}
                    </button>
                  );
                })()}
              </div>
            </div>
            {renderGlassCal("pedidos", filtroFecha, (v) => { setFiltroFecha(v); loadPedidos(v); })}

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
            </div>{/* ── end sticky filters wrapper ── */}

            {/* ── Pipeline summary ── */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12,
              padding: "18px 12px", borderRadius: 16,
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(162,194,208,0.3)",
              boxShadow: "0 2px 12px rgba(79,104,103,0.06)",
              marginBottom: 16,
            }}>
              {[
                { label: "Por preparar", count: statsPorPreparar, color: "#1565C0", bg: "#E3F2FD", desc: "Pedidos pendientes de elaborar en el obrador" },
                { label: "Listo para recoger", count: statsListoRecoger, color: "#E65100", bg: "#FFF3E0", desc: "Terminados y esperando recogida del cliente" },
                { label: "Recogido", count: statsRecogidos, color: "#2E7D32", bg: "#E8F5E9", desc: "Pedidos entregados al cliente" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <div style={{ position: "relative", width: 68, height: 68 }}>
                    <PipelineRing count={s.count} total={statsTotal || 1} color={s.color} bg={s.bg} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'Roboto Condensed', sans-serif", lineHeight: 1 }}>{s.count}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1B1C39", marginTop: 8, fontFamily: "'Roboto Condensed', sans-serif" }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: "#4F6867", marginTop: 3, lineHeight: 1.3, maxWidth: 130 }}>{s.desc}</span>
                </div>
              ))}
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
                    <img src="/logo-loader.png" alt="" style={{ display: "block", margin: "0 auto", width: 32, height: 32, borderRadius: "50%", animation: "logoSpin 2s linear infinite", }} />
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


        {tab === "nuevo" && <TabNuevo isDesktop={isDesktop} apiMode={apiMode} catalogo={catalogo} notify={notify} onCreatePedido={crearPedido} onViewOrder={verPedidoCreado} />}

        {tab === "produccion" && (
          <TabProduccion
            isDesktop={isDesktop}
            produccionData={produccionData}
            produccionFecha={produccionFecha}
            setProduccionFecha={setProduccionFecha}
            loadProduccion={loadProduccion}
            catalogo={catalogo}
            onSelectPedido={setSelectedPedido}
            onRequestPagadoChange={requestPagadoChange}
            renderGlassCal={renderGlassCal}
            openGlassCal={openGlassCal}
            setGlassCalTarget={setGlassCalTarget}
            glassCalTarget={glassCalTarget}
          />
        )}

        {selectedPedido && (
          <OrderDetailModal
            pedido={selectedPedido}
            isDesktop={isDesktop}
            pedidoFromFicha={pedidoFromFicha}
            catalogo={catalogo}
            onClose={() => { setSelectedPedido(null); setPedidoFromFicha(false); }}
            onEstadoChange={requestEstadoChange}
            onPagadoChange={requestPagadoChange}
            onSaveProducts={guardarModificacion}
            onSaveNotas={cambiarNotas}
            onChangeFecha={cambiarFechaPedido}
            onCancel={cancelarPedido}
            onPhoneMenu={openPhoneMenu}
          />
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

        {pendingEstadoChange && <ConfirmEstadoDialog pending={pendingEstadoChange} bulkCount={bulkSelected.size} onConfirm={confirmarCambioEstado} onCancel={() => setPendingEstadoChange(null)} />}

        {pendingPagadoChange && <ConfirmPagadoDialog pending={pendingPagadoChange} onConfirm={confirmarPagadoChange} onCancel={() => setPendingPagadoChange(null)} />}

        {whatsappPrompt && <WhatsAppPrompt prompt={whatsappPrompt} onClose={() => setWhatsappPrompt(null)} />}

        {phoneMenu && <PhoneMenuPopover phoneMenu={phoneMenu} onClose={() => setPhoneMenu(null)} />}

        {showHelp && <HelpOverlay initialCategory={tab === "produccion" ? "produccion" : tab === "nuevo" ? "nuevo" : "pedidos"} onClose={() => setShowHelp(false)} />}

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
          <button title={t.tip} key={t.key} onClick={() => { setTab(t.key); setGlassCalTarget(null); if (t.key !== "pedidos") { setBusqueda(""); setBulkMode(false); setBulkSelected(new Set()); } if (t.key === "produccion" && produccionData.length === 0) loadProduccion(); }}
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
    </div>
  );
}

