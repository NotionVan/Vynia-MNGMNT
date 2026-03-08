import { useState, useEffect, useCallback, useRef } from "react";
import { invalidateApiCache } from "./api.js";
import { VYNIA_LOGO } from "./constants/brand.js";
import { ESTADOS, ESTADO_TRANSITIONS } from "./constants/estados.js";
import I from "./components/Icons.jsx";
import useBreakpoint from "./hooks/useBreakpoint.js";
import useTooltip from "./hooks/useTooltip.js";
import useVersionCheck from "./hooks/useVersionCheck.js";
import useCatalog from "./hooks/useCatalog.js";
import useGlassCalendar from "./hooks/useGlassCalendar.jsx";
import usePedidos from "./hooks/usePedidos.js";
import useProduccion from "./hooks/useProduccion.js";
import ConfirmEstadoDialog from "./components/ConfirmEstadoDialog.jsx";
import ConfirmPagadoDialog from "./components/ConfirmPagadoDialog.jsx";
import WhatsAppPrompt from "./components/WhatsAppPrompt.jsx";
import PhoneMenuPopover from "./components/PhoneMenuPopover.jsx";
import HelpOverlay from "./components/HelpOverlay.jsx";
import HorarioEditor from "./components/HorarioEditor.jsx";
import { loadHorarioLocal, loadHorario as loadHorarioAsync } from "./utils/horario.js";
import OrderDetailModal from "./components/OrderDetailModal.jsx";
import TabNuevo from "./components/TabNuevo.jsx";
import TabProduccion from "./components/TabProduccion.jsx";
import TabPedidos from "./components/TabPedidos.jsx";
import { VyniaProvider } from "./context/VyniaContext.jsx";
import { PedidosProvider } from "./context/PedidosContext.jsx";

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
  const [toast, setToast] = useState(null);     // { type: "ok"|"err", msg }
  const [apiMode, setApiMode] = useState("live"); // demo | live
  const [showChangelog, setShowChangelog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mostrarDatos, setMostrarDatos] = useState(false);
  const [showHorario, setShowHorario] = useState(false);
  const [horario, setHorario] = useState(null);
  const [horarioLastEdited, setHorarioLastEdited] = useState(null);

  // ─── REFS ───
  const toastTimer = useRef(null);
  const menuRef = useRef(null);
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);

  // ─── EXTRACTED HOOKS ───
  const tooltip = useTooltip();
  const { updateAvailable, setUpdateAvailable } = useVersionCheck();
  const catalogo = useCatalog(apiMode);
  const { glassCalTarget, setGlassCalTarget, openGlassCal, renderGlassCal } = useGlassCalendar();

  // ─── TOAST ───
  const notify = useCallback((type, msg) => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── DATA HOOKS ───
  const prod = useProduccion({ apiMode, notify });
  const ped = usePedidos({
    apiMode, notify,
    onInvalidateProduccion: prod.invalidateProduccion,
    onUpdateProduccionPagado: prod.updatePagado,
  });

  // ─── GLOBAL LOADING ───
  const loading = ped.pedidosLoading || prod.produccionLoading;

  // ─── INITIAL LOAD ───
  useEffect(() => { ped.loadPedidos(); prod.loadProduccion(); }, [apiMode]);

  // ─── HORARIO LOAD (localStorage instant + Notion async) ───
  useEffect(() => {
    const local = loadHorarioLocal();
    if (local?.horario) { setHorario(local.horario); setHorarioLastEdited(local.lastEdited || null); }
    if (apiMode !== "demo") {
      loadHorarioAsync().then(res => {
        if (res?.horario) { setHorario(res.horario); setHorarioLastEdited(res.lastEdited || null); }
      }).catch(() => {});
    }
  }, [apiMode]);

  // ─── Auto-refresh: reload on tab focus (debounced) + poll every 120s ───
  useEffect(() => {
    if (apiMode === "demo") return;
    const reload = () => { invalidateApiCache(); ped.loadPedidos(undefined, { skipEnrich: true }); if (tab === "produccion") prod.loadProduccion(); };
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
  }, [apiMode, tab, ped.loadPedidos]);

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

  // ─── VIEW ORDER (wrapper adds setTab) ───
  const handleViewOrder = (pedidoId, resultData) => {
    setTab("pedidos");
    ped.verPedidoCreado(pedidoId, resultData);
  };

  // ═══════════════════════════════════════════════════════════
  //  CONTEXT VALUES
  // ═══════════════════════════════════════════════════════════
  const uiCtx = {
    // Layout
    isDesktop, isTablet, headerH,
    // Core
    apiMode, catalogo,
    // Handlers
    notify, requestEstadoChange: ped.requestEstadoChange,
    requestPagadoChange: ped.requestPagadoChange,
    openPhoneMenu: ped.openPhoneMenu,
    // Privacy toggle
    mostrarDatos, setMostrarDatos,
    // Glass calendar
    renderGlassCal, openGlassCal, setGlassCalTarget, glassCalTarget,
    // Horario
    horario,
  };

  const pedCtx = {
    pedidos: ped.pedidos,
    filtro: ped.filtro, setFiltro: ped.setFiltro,
    filtroFecha: ped.filtroFecha, setFiltroFecha: ped.setFiltroFecha,
    statsTotal: ped.statsTotal, statsPendientes: ped.statsPendientes,
    statsRecogidos: ped.statsRecogidos, statsPorPreparar: ped.statsPorPreparar,
    statsListoRecoger: ped.statsListoRecoger,
    bulkMode: ped.bulkMode, setBulkMode: ped.setBulkMode,
    bulkSelected: ped.bulkSelected, setBulkSelected: ped.setBulkSelected,
    loadPedidos: ped.loadPedidos,
    setEstadoPicker: ped.setEstadoPicker,
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <VyniaProvider value={uiCtx}>
    <PedidosProvider value={pedCtx}>
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
                { label: "Total", value: ped.statsTotal, color: "#4F6867", filter: "todos" },
                { label: "Pendientes", value: ped.statsPendientes, color: "#1565C0", filter: "pendientes" },
                { label: "Recogidos", value: ped.statsRecogidos, color: "#2E7D32", filter: "recogidos" },
              ].map(s => {
                const active = ped.filtro === s.filter && tab === "pedidos";
                return (
                <button key={s.label} className="dot-card" title={`Filtrar por ${s.label.toLowerCase()}`} onClick={() => { setTab("pedidos"); ped.setFiltro(s.filter); }}
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
                  { icon: <I.Refresh s={16} />, label: "Recargar pedidos", action: () => { invalidateApiCache(); ped.loadPedidos(); } },
                  { icon: <I.Printer s={16} />, label: "Imprimir", action: () => window.print() },
                  { icon: <I.Help s={16} />, label: "Manual de uso", action: () => { setShowHelp(true); } },
                  { icon: <I.Clock s={16} />, label: "Horario del negocio", action: () => setShowHorario(true) },
                  { icon: <I.Broom s={16} />, label: "Limpiar registros", action: ped.cleanupOrphanRegistros },
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
            { label: "Total", value: ped.statsTotal, color: "#4F6867", filter: "todos" },
            { label: "Pendientes", value: ped.statsPendientes, color: "#1565C0", filter: "pendientes" },
            { label: "Recogidos", value: ped.statsRecogidos, color: "#2E7D32", filter: "recogidos" },
          ].map(s => {
            const active = ped.filtro === s.filter && tab === "pedidos";
            return (
            <button key={s.label} className="dot-card" title={`Filtrar por ${s.label.toLowerCase()}`} onClick={() => { setTab("pedidos"); ped.setFiltro(s.filter); }}
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
              {" · Filtro: "}{ped.filtro.charAt(0).toUpperCase() + ped.filtro.slice(1)}
              {" · "}{ped.pedidos.length} pedido{ped.pedidos.length !== 1 ? "s" : ""}
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
              ped.setSelectedPedido(pedido);
              if (fromFicha) ped.setPedidoFromFicha(true);
            }}
          />
        )}


        {tab === "nuevo" && <TabNuevo onCreatePedido={ped.crearPedido} onViewOrder={handleViewOrder} />}

        {tab === "produccion" && (
          <TabProduccion
            produccionData={prod.produccionData}
            produccionFecha={prod.produccionFecha}
            setProduccionFecha={prod.setProduccionFecha}
            loadProduccion={prod.loadProduccion}
            onSelectPedido={ped.setSelectedPedido}
          />
        )}

        {ped.selectedPedido && (
          <OrderDetailModal
            pedido={ped.selectedPedido}
            pedidoFromFicha={ped.pedidoFromFicha}
            onClose={() => { ped.setSelectedPedido(null); ped.setPedidoFromFicha(false); }}
            onSaveProducts={ped.guardarModificacion}
            onSaveNotas={ped.cambiarNotas}
            onChangeFecha={ped.cambiarFechaPedido}
            onCancel={ped.cancelarPedido}
          />
        )}

        {/* ══════════════════════════════════════════
            ESTADO PICKER POPOVER
        ══════════════════════════════════════════ */}
        {ped.estadoPicker && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }} onClick={() => ped.setEstadoPicker(null)}>
            <div style={{
              position: "absolute",
              left: Math.min(Math.max(ped.estadoPicker.x - 100, 10), window.innerWidth - 220),
              top: Math.min(ped.estadoPicker.y, window.innerHeight - 250),
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
                {(ESTADO_TRANSITIONS[ped.estadoPicker.currentEstado] || []).map((est, i, arr) => {
                  const cfg = ESTADOS[est];
                  return (
                    <button key={est} onClick={() => {
                      const pedido = ped.pedidos.find(p => p.id === ped.estadoPicker.pedidoId) || { id: ped.estadoPicker.pedidoId, fecha: "", tel: "", cliente: "" };
                      ped.requestEstadoChange(pedido, est);
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

        {ped.pendingEstadoChange && <ConfirmEstadoDialog pending={ped.pendingEstadoChange} bulkCount={ped.bulkSelected.size} onConfirm={ped.confirmarCambioEstado} onCancel={() => ped.setPendingEstadoChange(null)} />}

        {ped.pendingPagadoChange && <ConfirmPagadoDialog pending={ped.pendingPagadoChange} onConfirm={ped.confirmarPagadoChange} onCancel={() => ped.setPendingPagadoChange(null)} />}

        {ped.whatsappPrompt && <WhatsAppPrompt prompt={ped.whatsappPrompt} onClose={() => ped.setWhatsappPrompt(null)} />}

        {ped.phoneMenu && <PhoneMenuPopover phoneMenu={ped.phoneMenu} onClose={() => ped.setPhoneMenu(null)} />}

        {showHelp && <HelpOverlay initialCategory={tab === "produccion" ? "produccion" : tab === "nuevo" ? "nuevo" : "pedidos"} onClose={() => setShowHelp(false)} />}

        {showHorario && (
          <HorarioEditor
            horario={horario}
            lastEdited={horarioLastEdited}
            onSave={(updated) => setHorario(updated)}
            onClose={() => setShowHorario(false)}
          />
        )}

      </main>

      {/* ════ BULK ACTION BAR ════ */}
      {ped.bulkMode && ped.bulkSelected.size > 0 && (
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
              {ped.bulkSelected.size} seleccionado{ped.bulkSelected.size > 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
              {ped.bulkTransitions.map(est => {
                const cfg = ESTADOS[est];
                return (
                  <button key={est} disabled={ped.bulkLoading} onClick={() => ped.requestEstadoChange(null, est, { isBulk: true })}
                    style={{
                      padding: "8px 14px", borderRadius: 10,
                      border: "none",
                      background: cfg.color,
                      color: "#fff",
                      fontSize: 12, fontWeight: 700,
                      fontFamily: "'Roboto Condensed', sans-serif",
                      cursor: ped.bulkLoading ? "wait" : "pointer",
                      opacity: ped.bulkLoading ? 0.6 : 1,
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}>
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
              {ped.bulkTransitions.length === 0 && (
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
          <button title={t.tip} key={t.key} onClick={() => { setTab(t.key); setGlassCalTarget(null); if (t.key !== "pedidos") { ped.setBulkMode(false); ped.setBulkSelected(new Set()); } if (t.key === "produccion" && prod.produccionData.length === 0) prod.loadProduccion(); }}
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
    </PedidosProvider>
    </VyniaProvider>
  );
}
