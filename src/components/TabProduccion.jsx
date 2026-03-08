import { useState, useEffect, useCallback, useMemo } from "react";
import NumberFlow from "@number-flow/react";
import I from "./Icons.jsx";
import { ESTADOS, effectiveEstado } from "../constants/estados.js";
import { FRECUENTES } from "../constants/catalogo.js";
import { fmt } from "../utils/fmt.js";
import { cleanOldSurplus, loadSurplusPlan, loadSurplusPlanLocal, saveSurplusPlan } from "../utils/surplus.js";
import { useVynia } from "../context/VyniaContext.jsx";

export default function TabProduccion({
  produccionData,
  produccionFecha,
  setProduccionFecha,
  loadProduccion,
  onSelectPedido,
}) {
  const {
    isDesktop, catalogo,
    requestPagadoChange: onRequestPagadoChange,
    renderGlassCal, openGlassCal, setGlassCalTarget, glassCalTarget,
  } = useVynia();
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [expandAll, setExpandAll] = useState(false);
  const [ocultarRecogidos, setOcultarRecogidos] = useState(true);
  const [surplusPlan, setSurplusPlan] = useState({});
  const [surplusSearch, setSurplusSearch] = useState("");
  const [surplusEditing, setSurplusEditing] = useState(false);
  const [surplusInfoOpen, setSurplusInfoOpen] = useState(false);

  useEffect(() => { cleanOldSurplus(); }, []);

  useEffect(() => {
    let cancelled = false;
    setSurplusSearch("");
    setSurplusInfoOpen(false);
    // Load from localStorage instantly, then replace with Notion data
    setSurplusPlan(loadSurplusPlanLocal(produccionFecha));
    loadSurplusPlan(produccionFecha).then(plan => {
      if (!cancelled) setSurplusPlan(plan);
    });
    return () => { cancelled = true; };
  }, [produccionFecha]);

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

  return (
    <div style={{ paddingTop: 16 }}>
      <h2 style={{
        fontFamily: "'Roboto Condensed', sans-serif", fontSize: 22, fontWeight: 700,
        margin: "0 0 16px", color: "#1B1C39", textAlign: "center",
      }}>Producci&oacute;n Diaria</h2>

      <div style={{
        display: isDesktop ? "flex" : "block",
        gap: isDesktop ? 16 : 0,
        alignItems: "center",
        marginBottom: 14,
      }}>
        <div style={{ marginBottom: isDesktop ? 0 : 14, flex: isDesktop ? 1 : undefined }}>
          <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "rgba(79,104,103,0.06)", border: "1px solid rgba(162,194,208,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderRadius: 14 }}>
          {[
            { label: "Hoy", val: fmt.todayISO() },
            { label: "Ma\u00f1ana", val: fmt.tomorrowISO() },
            { label: "Pasado", val: fmt.dayAfterISO() },
          ].map(d => {
            const sel = produccionFecha === d.val;
            return (
            <button key={d.label} title={`Ver producci\u00f3n de ${d.label.toLowerCase()}`} onClick={() => { setProduccionFecha(d.val); setExpandedProduct(null); setExpandAll(false); loadProduccion(d.val); setGlassCalTarget(null); }}
              style={{
                position: "relative", flex: 1, padding: "8px 12px", borderRadius: 10,
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
          {(() => {
            const isPreset = [fmt.todayISO(), fmt.tomorrowISO(), fmt.dayAfterISO()].includes(produccionFecha);
            const calOpen = glassCalTarget === "produccion";
            const active = !isPreset || calOpen;
            return (
              <button title="Seleccionar fecha" onClick={() => openGlassCal("produccion", produccionFecha)}
                style={{
                  position: "relative", display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 10,
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
                {!isPreset ? new Date(produccionFecha + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "Fecha"}
              </button>
            );
          })()}
          </div>
        </div>
        {renderGlassCal("produccion", produccionFecha, (v) => { setProduccionFecha(v); setExpandedProduct(null); setExpandAll(false); loadProduccion(v); })}

        <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "rgba(79,104,103,0.06)", border: "1px solid rgba(162,194,208,0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderRadius: 14, flex: isDesktop ? "none" : undefined }}>
          {[
            { label: "Pendiente", val: true, tip: "Ver solo producci\u00f3n pendiente" },
            { label: "Todo el d\u00eda", val: false, tip: "Ver toda la producci\u00f3n del d\u00eda" },
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
      </div>

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
                        ? `${surplusTotals.totalPlan} plan \u00b7 ${surplusTotals.totalPedidos} pedidos \u00b7 ${surplusTotals.totalDisp} disp.`
                        : "Introduce lo que vas a producir"}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
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

            {isOpen && (
              <div style={{ padding: "12px 16px 16px", animation: "popoverIn 0.15s ease-out" }}>
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

      {(() => {
        if (produccionData.length === 0) return (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#A2C2D0" }}>
            <I.Store s={40} />
            <p style={{ marginTop: 12, fontSize: 14 }}>No hay producci&oacute;n para este d&iacute;a</p>
            <button title="Cargar datos de producci\u00f3n" onClick={() => loadProduccion()} style={{
              marginTop: 8, padding: "8px 16px", borderRadius: 8,
              border: "1px solid #A2C2D0", background: "#fff",
              cursor: "pointer", fontSize: 12, color: "#4F6867", fontWeight: 600,
            }}>Cargar</button>
          </div>
        );

        return (
          <div>
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
                        }}>{"\u25B6"}</span>
                      </div>
                    </button>

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
                          <button title="Ver detalle del pedido" key={ped.pedidoId + "-" + i} onClick={() => onSelectPedido({ ...ped, id: ped.pedidoId, estado: effectiveEstado(ped), tel: ped.telefono || ped.tel })}
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
                                <button title={ped.pagado ? "Desmarcar como pagado" : "Marcar como pagado"} onClick={(e) => { e.stopPropagation(); onRequestPagadoChange({ id: ped.pedidoId, pagado: ped.pagado }); }}
                                  style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: 700, cursor: "pointer", border: "none", marginLeft: 6, transition: "all 0.2s",
                                    background: ped.pagado ? "#E1F2FC" : "rgba(162,194,208,0.15)", color: ped.pagado ? "#3D5655" : "#A2C2D0",
                                  }}>{ped.pagado ? "PAGADO" : "\u20AC"}</button>
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
  );
}
