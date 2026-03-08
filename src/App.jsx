import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { notion, invalidateApiCache, invalidatePedidosCache } from "./api.js";
import { VYNIA_LOGO, VYNIA_LOGO_MD } from "./constants/brand.js";
import { ESTADOS, ESTADO_PROGRESS, ESTADO_NEXT, ESTADO_ACTION, ESTADO_TRANSITIONS, effectiveEstado } from "./constants/estados.js";
import { fmt } from "./utils/fmt.js";
import { esTarde, parseProductsStr } from "./utils/helpers.js";
import I from "./components/Icons.jsx";
import useBreakpoint from "./hooks/useBreakpoint.js";
import useTooltip from "./hooks/useTooltip.js";
import useVersionCheck from "./hooks/useVersionCheck.js";
import useCatalog from "./hooks/useCatalog.js";
import useGlassCalendar from "./hooks/useGlassCalendar.js";
import PipelineRing from "./components/PipelineRing.jsx";
import ConfirmEstadoDialog from "./components/ConfirmEstadoDialog.jsx";
import ConfirmPagadoDialog from "./components/ConfirmPagadoDialog.jsx";
import WhatsAppPrompt from "./components/WhatsAppPrompt.jsx";
import PhoneMenuPopover from "./components/PhoneMenuPopover.jsx";
import HelpOverlay from "./components/HelpOverlay.jsx";
import OrderDetailModal from "./components/OrderDetailModal.jsx";
import TabNuevo from "./components/TabNuevo.jsx";
import TabProduccion from "./components/TabProduccion.jsx";
import TabPedidos from "./components/TabPedidos.jsx";
import { VyniaProvider } from "./context/VyniaContext.jsx";

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

  // ─── EXTRACTED HOOKS ───
  const tooltip = useTooltip();
  const { updateAvailable, setUpdateAvailable } = useVersionCheck();
  const catalogo = useCatalog(apiMode);
  const { glassCalTarget, setGlassCalTarget, openGlassCal, renderGlassCal } = useGlassCalendar();

  // Pedidos data
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState("pendientes"); // pendientes | hoy | todos | recogidos
  const [filtroFecha, setFiltroFecha] = useState(fmt.todayISO()); // null = all dates
  const [showChangelog, setShowChangelog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [pedidoFromFicha, setPedidoFromFicha] = useState(false);

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
  const [mostrarDatos, setMostrarDatos] = useState(false);

  // Refs
  const toastTimer = useRef(null);
  const pendingViewPedidoId = useRef(null);
  const registrosCache = useRef({}); // { [pedidoId]: { ts, data } }

  // ─── TOAST ───
  const notify = useCallback((type, msg) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

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

  // ─── Close menu on click outside ───
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
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

  // ─── LOAD PRODUCTS FOR SELECTED PEDIDO (with in-memory cache) ───
  useEffect(() => {
    if (!selectedPedido || apiMode === "demo") return;
    const hasIds = Array.isArray(selectedPedido.productos) && selectedPedido.productos.length > 0 && selectedPedido.productos[0]?.id;
    if (hasIds) return;
    // Check registros cache (60s TTL)
    const cached = registrosCache.current[selectedPedido.id];
    if (cached && Date.now() - cached.ts < 60000) {
      setSelectedPedido(prev => prev && prev.id === selectedPedido.id ? { ...prev, productos: cached.data } : prev);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const prods = await notion.loadRegistros(selectedPedido.id);
        if (!cancelled && Array.isArray(prods) && prods.length > 0) {
          registrosCache.current[selectedPedido.id] = { ts: Date.now(), data: prods };
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
      let deleteWarning = false;
      if (oldIds.length > 0) {
        try {
          await notion.deleteRegistros(oldIds);
        } catch (delErr) {
          console.error("Error borrando registros antiguos:", delErr);
          deleteWarning = true;
        }
      }
      // Reload fresh registros (with new IDs) and update cache
      const freshProds = await notion.loadRegistros(pedido.id);
      delete registrosCache.current[pedido.id];
      if (Array.isArray(freshProds) && freshProds.length > 0) {
        registrosCache.current[pedido.id] = { ts: Date.now(), data: freshProds };
      }
      setSelectedPedido(prev => prev ? { ...prev, productos: Array.isArray(freshProds) ? freshProds : [] } : prev);
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, importe: newImporte, productos: newProdsStr } : p));
      invalidateProduccion(pedido.fecha); invalidateSearchCache();
      notify(deleteWarning ? "warn" : "ok", deleteWarning ? "Pedido modificado, pero la limpieza de registros antiguos falló" : "Pedido modificado");
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

  // ─── BULK TRANSITIONS (intersection of valid transitions for all selected) ───
  const bulkTransitions = useMemo(() => {
    if (bulkSelected.size === 0) return [];
    const selected = pedidos.filter(p => bulkSelected.has(p.id));
    if (selected.length === 0) return [];
    const sets = selected.map(p => new Set(ESTADO_TRANSITIONS[p.estado] || []));
    return [...sets[0]].filter(est => sets.every(s => s.has(est)));
  }, [bulkSelected, pedidos]);

  // ═══════════════════════════════════════════════════════════
  //  CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════
  const ctx = {
    // Layout
    isDesktop, isTablet, headerH,
    // Core data
    pedidos, apiMode, catalogo,
    // Filters
    filtro, setFiltro, filtroFecha, setFiltroFecha,
    // Stats
    statsTotal, statsPendientes, statsRecogidos, statsPorPreparar, statsListoRecoger,
    // Bulk
    bulkMode, setBulkMode, bulkSelected, setBulkSelected,
    // Handlers
    notify, loadPedidos, requestEstadoChange, requestPagadoChange, openPhoneMenu,
    setEstadoPicker,
    // Privacy toggle
    mostrarDatos, setMostrarDatos,
    // Glass calendar
    renderGlassCal, openGlassCal, setGlassCalTarget, glassCalTarget,
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <VyniaProvider value={ctx}>
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
              {" · "}{pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ════ TOAST ════ */}
      {toast && (
        <div style={{
          position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)",
          padding: "10px 20px", borderRadius: 10, zIndex: 200,
          background: toast.type === "ok" ? "#3D5655" : toast.type === "warn" ? "#E65100" : "#C62828",
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

        {tab === "pedidos" && (
          <TabPedidos
            onSelectPedido={(pedido, fromFicha) => {
              setSelectedPedido(pedido);
              if (fromFicha) setPedidoFromFicha(true);
            }}
          />
        )}


        {tab === "nuevo" && <TabNuevo onCreatePedido={crearPedido} onViewOrder={verPedidoCreado} />}

        {tab === "produccion" && (
          <TabProduccion
            produccionData={produccionData}
            produccionFecha={produccionFecha}
            setProduccionFecha={setProduccionFecha}
            loadProduccion={loadProduccion}
            onSelectPedido={setSelectedPedido}
          />
        )}

        {selectedPedido && (
          <OrderDetailModal
            pedido={selectedPedido}
            pedidoFromFicha={pedidoFromFicha}
            onClose={() => { setSelectedPedido(null); setPedidoFromFicha(false); }}
            onSaveProducts={guardarModificacion}
            onSaveNotas={cambiarNotas}
            onChangeFecha={cambiarFechaPedido}
            onCancel={cancelarPedido}
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
          <button title={t.tip} key={t.key} onClick={() => { setTab(t.key); setGlassCalTarget(null); if (t.key !== "pedidos") { setBulkMode(false); setBulkSelected(new Set()); } if (t.key === "produccion" && produccionData.length === 0) loadProduccion(); }}
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
    </VyniaProvider>
  );
}

