import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { notion, invalidateApiCache, invalidatePedidosCache } from "../api.js";
import { ESTADOS, effectiveEstado } from "../constants/estados.js";
import { fmt } from "../utils/fmt.js";
import { parseProductsStr } from "../utils/helpers.js";
import { computePedidoStats, computeBulkTransitions } from "../utils/stats.js";

export default function usePedidos({ apiMode, notify, onInvalidateProduccion, onUpdateProduccionPagado }) {
  // ─── STATE ───
  const [pedidos, setPedidos] = useState([]);
  const [pedidosLoading, setPedidosLoading] = useState(false);
  const [filtro, setFiltro] = useState("pendientes");
  const [filtroFecha, setFiltroFecha] = useState(fmt.todayISO());

  const [selectedPedido, setSelectedPedido] = useState(null);
  const [pedidoFromFicha, setPedidoFromFicha] = useState(false);

  // Bulk selection
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Estado / pagado dialogs
  const [estadoPicker, setEstadoPicker] = useState(null);
  const [pendingEstadoChange, setPendingEstadoChange] = useState(null);
  const [pendingPagadoChange, setPendingPagadoChange] = useState(null);

  // Phone / WhatsApp
  const [phoneMenu, setPhoneMenu] = useState(null);
  const [whatsappPrompt, setWhatsappPrompt] = useState(null);

  // Refs
  const registrosCache = useRef({});
  const pendingViewPedidoId = useRef(null);

  // ─── INVALIDATION HELPERS ───
  const invalidateSearchCache = () => { invalidatePedidosCache(); };

  // ─── LOAD PEDIDOS ───
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

    setPedidosLoading(true);
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
      setPedidosLoading(false);
    }
  }, [apiMode, filtroFecha, notify]);

  // ─── LOAD REGISTROS FOR SELECTED PEDIDO (with in-memory cache) ───
  useEffect(() => {
    if (!selectedPedido || apiMode === "demo") return;
    const hasIds = Array.isArray(selectedPedido.productos) && selectedPedido.productos.length > 0 && selectedPedido.productos[0]?.id;
    if (hasIds) return;
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
  }, [selectedPedido?.id, apiMode]);

  // ─── PENDING VIEW PEDIDO (race condition workaround) ───
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

  // ─── CAMBIAR ESTADO ───
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
    setPedidosLoading(true);
    try {
      await notion.cambiarEstado(pedido.id, nuevoEstado);
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, estado: nuevoEstado } : p));
      onInvalidateProduccion(pedido.fecha); invalidateSearchCache();
      notify("ok", `${ESTADOS[nuevoEstado]?.icon || ""} ${ESTADOS[nuevoEstado]?.label || nuevoEstado}`);
      if (nuevoEstado === "Listo para recoger" && (pedido.telefono || pedido.tel)) {
        setWhatsappPrompt({ tel: pedido.telefono || pedido.tel, nombre: pedido.cliente || pedido.titulo || pedido.nombre });
      }
    } catch (err) {
      notify("err", err.message);
    } finally {
      setPedidosLoading(false);
    }
  };

  // ─── BULK ESTADO CHANGE ───
  const cambiarEstadoBulk = async (nuevoEstado) => {
    const selected = pedidos.filter(p => bulkSelected.has(p.id));
    if (selected.length === 0) return;
    setBulkLoading(true);
    const prevEstados = new Map(selected.map(p => [p.id, p.estado]));
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
        setPedidos(ps => ps.map(p => failedIds.has(p.id) ? { ...p, estado: prevEstados.get(p.id) } : p));
        notify("err", `${failCount} pedido${failCount > 1 ? "s" : ""} fallaron`);
      }
      onInvalidateProduccion(); invalidateSearchCache();
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
    setPedidosLoading(true);
    try {
      await notion.archivarPedido(pedido.id);
      setPedidos(ps => ps.filter(p => p.id !== pedido.id));
      onInvalidateProduccion(pedido.fecha); invalidateSearchCache();
      setSelectedPedido(null);
      notify("ok", "Pedido cancelado");
    } catch (err) {
      notify("err", err.message);
    } finally {
      setPedidosLoading(false);
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
    setPedidosLoading(true);
    try {
      await notion.updatePage(pedido.id, { "Fecha entrega": { date: { start: newFecha } } });
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, fecha: newFecha, hora: "" } : p));
      onInvalidateProduccion(pedido.fecha); onInvalidateProduccion(newFecha); invalidateSearchCache();
      notify("ok", "Fecha actualizada");
      return true;
    } catch (err) {
      notify("err", err.message);
    } finally {
      setPedidosLoading(false);
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
    setPedidosLoading(true);
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
      setPedidosLoading(false);
    }
  };

  // ─── PAGADO ───
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
      onUpdateProduccionPagado(pedido.id, newVal);
    };
    if (apiMode === "demo") {
      updateLocal();
      notify("ok", newVal ? "Marcado como pagado" : "Desmarcado como pagado");
      return;
    }
    updateLocal();
    try {
      await notion.updatePage(pedido.id, {
        "Pagado al reservar": { checkbox: newVal }
      });
      invalidateSearchCache();
      notify("ok", newVal ? "Marcado como pagado" : "Desmarcado como pagado");
    } catch (err) {
      const rollback = () => {
        setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, pagado: !newVal } : p));
        if (selectedPedido?.id === pedido.id) setSelectedPedido(prev => prev ? { ...prev, pagado: !newVal } : prev);
        onUpdateProduccionPagado(pedido.id, !newVal);
      };
      rollback();
      notify("err", err.message);
    }
  };

  // ─── MODIFY PRODUCTS ───
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
    setPedidosLoading(true);
    try {
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
      const freshProds = await notion.loadRegistros(pedido.id);
      delete registrosCache.current[pedido.id];
      if (Array.isArray(freshProds) && freshProds.length > 0) {
        registrosCache.current[pedido.id] = { ts: Date.now(), data: freshProds };
      }
      setSelectedPedido(prev => prev ? { ...prev, productos: Array.isArray(freshProds) ? freshProds : [] } : prev);
      setPedidos(ps => ps.map(p => p.id === pedido.id ? { ...p, importe: newImporte, productos: newProdsStr } : p));
      onInvalidateProduccion(pedido.fecha); invalidateSearchCache();
      notify(deleteWarning ? "warn" : "ok", deleteWarning ? "Pedido modificado, pero la limpieza de registros antiguos falló" : "Pedido modificado");
      return true;
    } catch (err) {
      notify("err", err.message);
    } finally {
      setPedidosLoading(false);
    }
  };

  // ─── PHONE MENU ───
  const openPhoneMenu = (tel, e) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setPhoneMenu({ tel, x: rect.left + rect.width / 2, y: rect.bottom + 4 });
  };

  // ─── CREATE ORDER ───
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

    setPedidosLoading(true);
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
      onInvalidateProduccion(fecha); invalidateSearchCache();
      return { status: "ok", cliente, total, pedidoId: pedidoRes.id, telefono, fecha, hora, pagado, notas, lineas };
    } catch (err) {
      notify("err", "Error: " + (err.message || "").substring(0, 100));
      return { status: "err", message: err.message || "Error desconocido" };
    } finally {
      setPedidosLoading(false);
    }
  };

  // ─── VIEW CREATED ORDER ───
  const verPedidoCreado = (pedidoId, resultData) => {
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

  // ─── STATS (single-pass, memoized) ───
  const { statsTotal, statsPendientes, statsRecogidos, statsPorPreparar, statsListoRecoger } = useMemo(
    () => computePedidoStats(pedidos), [pedidos]
  );

  // ─── BULK TRANSITIONS ───
  const bulkTransitions = useMemo(
    () => computeBulkTransitions(pedidos, bulkSelected), [bulkSelected, pedidos]
  );

  return {
    // State
    pedidos, pedidosLoading,
    selectedPedido, setSelectedPedido,
    pedidoFromFicha, setPedidoFromFicha,
    filtro, setFiltro, filtroFecha, setFiltroFecha,
    bulkMode, setBulkMode, bulkSelected, setBulkSelected, bulkLoading,
    estadoPicker, setEstadoPicker,
    pendingEstadoChange, setPendingEstadoChange,
    pendingPagadoChange, setPendingPagadoChange,
    phoneMenu, setPhoneMenu,
    whatsappPrompt, setWhatsappPrompt,
    registrosCache,
    // Stats
    statsTotal, statsPendientes, statsRecogidos, statsPorPreparar, statsListoRecoger,
    bulkTransitions,
    // Handlers
    loadPedidos, cambiarEstado, cambiarEstadoBulk,
    requestEstadoChange, confirmarCambioEstado,
    requestPagadoChange, confirmarPagadoChange,
    cancelarPedido, cleanupOrphanRegistros,
    cambiarFechaPedido, cambiarNotas, guardarModificacion,
    openPhoneMenu, crearPedido, verPedidoCreado,
    invalidateSearchCache,
  };
}
