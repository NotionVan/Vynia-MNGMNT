import { useState, useEffect, useRef, useMemo } from "react";
import { notion, invalidateApiCache } from "../api.js";
import { VYNIA_LOGO_MD } from "../constants/brand.js";
import { ESTADOS, ESTADO_PROGRESS, ESTADO_NEXT, ESTADO_ACTION, effectiveEstado } from "../constants/estados.js";
import { fmt } from "../utils/fmt.js";
import { esTarde, parseProductsStr } from "../utils/helpers.js";
import I from "./Icons.jsx";
import EstadoGauge from "./EstadoGauge.jsx";
import PipelineRing from "./PipelineRing.jsx";
import { useVynia } from "../context/VyniaContext.jsx";
import { usePedidosCtx } from "../context/PedidosContext.jsx";

export default function TabPedidos({ onSelectPedido }) {
  const {
    isDesktop, isTablet, headerH, apiMode,
    requestEstadoChange, requestPagadoChange, openPhoneMenu,
    renderGlassCal, openGlassCal, setGlassCalTarget, glassCalTarget,
    notify, mostrarDatos, setMostrarDatos,
  } = useVynia();
  const {
    pedidos, filtro, setFiltro, filtroFecha, setFiltroFecha,
    statsTotal, statsPendientes, statsRecogidos, statsPorPreparar, statsListoRecoger,
    bulkMode, setBulkMode, bulkSelected, setBulkSelected,
    loadPedidos, setEstadoPicker,
  } = usePedidosCtx();
  const [renderLimit, setRenderLimit] = useState(30);
  const sentinelRef = useRef(null);
  const [busqueda, setBusqueda] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [fichaCliente, setFichaCliente] = useState(null);
  const [fichaClientePedidos, setFichaClientePedidos] = useState([]);
  const [fichaClienteLoading, setFichaClienteLoading] = useState(false);
  const [editingClienteData, setEditingClienteData] = useState(null);
  const [savingCliente, setSavingCliente] = useState(false);
  const busquedaTimer = useRef(null);
  const clienteWrapperRef = useRef(null);

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

  // Filtered pedidos
  const pedidosFiltrados = useMemo(() => {
    if (filtro === "pendientes") return pedidos.filter(p => ESTADOS[p.estado]?.group !== "complete");
    if (filtro === "recogidos") return pedidos.filter(p => p.estado === "Recogido");
    return pedidos;
  }, [pedidos, filtro]);

  // Reset render limit when filter/data changes
  useEffect(() => { setRenderLimit(30); }, [pedidosFiltrados]);

  const hasMorePedidos = renderLimit < pedidosFiltrados.length;

  // Group by date (uses sliced list for progressive rendering)
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

  return (
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
            { label: "Ma\u00f1ana", val: fmt.tomorrowISO() },
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
        <button className={`flow-btn${bulkMode ? " flow-btn-active" : ""}`} title={bulkMode ? "Cancelar selecci\u00f3n" : "Seleccionar pedidos"} onClick={() => {
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
                      {mostrarDatos ? ([c.telefono, c.email].filter(Boolean).join(" \u00b7 ") || "Sin datos de contacto") : "Cliente"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div title={mostrarDatos ? "Ocultar datos" : "Ver datos"} onClick={() => setMostrarDatos(v => !v)}
          role="button" tabIndex={0}
          style={{
            display: "flex", alignItems: "center", gap: 8, flexShrink: 0, cursor: "pointer",
          }}>
          <span style={{
            fontSize: 11, fontWeight: 500, color: "#4F6867",
            fontFamily: "'Roboto Condensed', sans-serif",
            whiteSpace: "nowrap",
          }}>{mostrarDatos ? "Ocultar datos" : "Ver datos"}</span>
          <div style={{
            width: 44, height: 24, padding: 2, borderRadius: 12,
            background: mostrarDatos ? "#4F6867" : "rgba(162,194,208,0.35)",
            border: `1px solid ${mostrarDatos ? "#4F6867" : "rgba(162,194,208,0.5)"}`,
            transition: "all 0.3s cubic-bezier(0.23,1,0.32,1)",
            display: "flex", alignItems: "center",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9,
              background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: mostrarDatos ? "translateX(20px)" : "translateX(0)",
              transition: "transform 0.3s cubic-bezier(0.23,1,0.32,1)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}>
              {mostrarDatos ? <I.Eye s={13} /> : <I.EyeOff s={13} />}
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
                    <I.Phone /> {mostrarDatos ? fichaCliente.telefono : "\u2022\u2022\u2022"}
                  </span>
                )}
                {fichaCliente.email && (
                  <span style={{ fontSize: 13, color: "#4F6867", display: "flex", alignItems: "center", gap: 4 }}>
                    <I.Mail s={13} /> {mostrarDatos ? fichaCliente.email : "\u2022\u2022\u2022"}
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
                <div key={p.id} onClick={() => { onSelectPedido({ ...p, pedidoTitulo: p.nombre, tel: p.tel, telefono: p.tel, productos: typeof p.productos === "string" ? parseProductsStr(p.productos) : (Array.isArray(p.productos) ? p.productos : []) }, true); }}
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
                        {(p.hora || fmt.time(p.fecha)) ? ` \u00b7 ${p.hora || fmt.time(p.fecha)}` : ""}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: "#A2C2D0" }}>{"\u2192"}</span>
                  </div>
                  {p.notas && (
                    <div style={{ fontSize: 11, color: "#A2C2D0", marginTop: 4, fontStyle: "italic" }}>
                      {p.notas.length > 60 ? p.notas.substring(0, 60) + "\u2026" : p.notas}
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
                      fmt.isTomorrow(dateKey) ? "Ma\u00f1ana" :
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

                {/* Order cards — split by Ma\u00f1ana/Tarde */}
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
                        <div onClick={bulkMode ? undefined : () => onSelectPedido({
                          ...p,
                          pedidoTitulo: p.nombre,
                          tel: p.tel, telefono: p.tel,
                          productos: typeof p.productos === "string" ? parseProductsStr(p.productos) : (Array.isArray(p.productos) ? p.productos : []),
                        }, false)} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: bulkMode ? "default" : "pointer" }}>
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
                                  {isBulkSel && "\u2713"}
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
                                  <I.Phone /> {mostrarDatos ? p.tel : "\u2022\u2022\u2022"}
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
                                {"\ud83d\udcdd"} {p.notas}
                              </div>
                            )}
                          </div>

                          {/* Amount */}
                          {mostrarDatos && <div style={{ textAlign: "right", minWidth: 60 }}>
                            <span style={{
                              fontSize: 18, fontWeight: 800,
                              fontFamily: "'Roboto Condensed', sans-serif",
                              color: "#4F6867",
                            }}>
                              {typeof p.importe === "number" && p.importe > 0 ? `${p.importe.toFixed(2)}\u20ac` : "\u2014"}
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
                              <button className="estado-btn" title={`\u2192 ${next}`} onClick={() => requestEstadoChange(p, next)}
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
                          <button className="estado-btn" title="M\u00e1s opciones de estado" onClick={(e) => {
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
                              {"\u00b7\u00b7\u00b7"}
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
                            {p.pagado ? <><I.Check s={13} /> Pagado</> : "\u20ac Pago"}
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
                              Ma{"\u00f1"}ana
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
              Mostrando {Math.min(renderLimit, pedidosFiltrados.length)} de {pedidosFiltrados.length} pedidos{"\u2026"}
            </div>
          )}
        </>
      )}
    </div>
  );
}
