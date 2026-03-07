import { useState } from "react";
import NumberFlow from "@number-flow/react";
import I from "./Icons.jsx";
import { ESTADOS, ESTADO_TRANSITIONS, ESTADO_ACTION } from "../constants/estados.js";
import { PRICE_MAP } from "../constants/catalogo.js";
import { fmt } from "../utils/fmt.js";
import { useVynia } from "../context/VyniaContext.jsx";

export default function OrderDetailModal({
  pedido,
  pedidoFromFicha,
  onClose,
  onSaveProducts,
  onSaveNotas,
  onChangeFecha,
  onCancel,
}) {
  const {
    isDesktop, catalogo,
    requestEstadoChange: onEstadoChange,
    requestPagadoChange: onPagadoChange,
    openPhoneMenu: onPhoneMenu,
  } = useVynia();
  const [editingFecha, setEditingFecha] = useState(null);
  const [editingNotas, setEditingNotas] = useState(null);
  const [editingProductos, setEditingProductos] = useState(false);
  const [editLineas, setEditLineas] = useState([]);
  const [editSearchProd, setEditSearchProd] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(null);

  const editProductosFiltrados = editSearchProd
    ? catalogo.filter(p => p.nombre.toLowerCase().includes(editSearchProd.toLowerCase()))
    : [];

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

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 20,
    }} onClick={onClose}>
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

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #4F6867, #3D5655)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 18, fontWeight: 800,
            fontFamily: "'Roboto Condensed', sans-serif",
            flexShrink: 0,
          }}>
            {(pedido.cliente || pedido.pedidoTitulo || "P").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif", overflowWrap: "break-word", wordBreak: "break-word" }}>
                {pedido.cliente || (pedido.pedidoTitulo || "").replace(/^Pedido\s+/i, "") || "Pedido"}
              </h3>
              {pedido.numPedido > 0 && (
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "#E1F2FC", color: "#4F6867", fontWeight: 700, border: "0.5px solid rgba(162,194,208,0.4)" }}>
                  #{pedido.numPedido}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              {pedido.estado && (
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700,
                  background: ESTADOS[pedido.estado]?.bg || "#F0F0F0",
                  color: ESTADOS[pedido.estado]?.color || "#8B8B8B",
                  border: `0.5px solid ${ESTADOS[pedido.estado]?.color || "#8B8B8B"}22`,
                }}>{ESTADOS[pedido.estado]?.icon} {ESTADOS[pedido.estado]?.label || pedido.estado}</span>
              )}
              {pedido.pagado && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 700,
                  background: "#E1F2FC", color: "#3D5655",
                  border: "0.5px solid rgba(79,104,103,0.2)",
                }}>PAGADO</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {pedidoFromFicha && (
              <button title="Volver a ficha de cliente" onClick={onClose} style={{
                border: "none", background: "#E1F2FC", cursor: "pointer",
                fontSize: 11, color: "#4F6867", fontWeight: 600, padding: "5px 10px",
                borderRadius: 8, fontFamily: "'Roboto Condensed', sans-serif",
              }}>← Cliente</button>
            )}
            <button title="Cerrar detalle" onClick={onClose} style={{
              width: 32, height: 32, border: "none", borderRadius: 10,
              background: "rgba(162,194,208,0.15)", cursor: "pointer",
              fontSize: 16, color: "#A2C2D0", display: "flex", alignItems: "center", justifyContent: "center",
            }}>×</button>
          </div>
        </div>

        {/* INFO SECTION */}
        <div style={{
          background: "rgba(239,233,228,0.5)", borderRadius: 14, padding: "10px 14px",
          marginBottom: 12, border: "1px solid rgba(162,194,208,0.12)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pedido.fecha && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <I.Cal s={14} />
                <span style={{ color: "#4F6867" }}>{fmt.date(pedido.fecha)}</span>
                {(pedido.hora || fmt.time(pedido.fecha)) && (
                  <span style={{ color: "#1B1C39", fontWeight: 600 }}>
                    {pedido.hora || fmt.time(pedido.fecha)}
                  </span>
                )}
              </div>
            )}
            {(pedido.telefono || pedido.tel) && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <I.Phone s={14} />
                <span onClick={(e) => onPhoneMenu(pedido.telefono || pedido.tel, e)} style={{ color: "#1B1C39", cursor: "pointer" }}>
                  {pedido.telefono || pedido.tel}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* PAGADO BUTTON */}
        <button title={pedido.pagado ? "Desmarcar como pagado" : "Marcar como pagado"}
          onClick={() => onPagadoChange(pedido)}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 14, cursor: "pointer",
            fontFamily: "'Roboto Condensed', sans-serif", fontSize: 14, fontWeight: 700,
            letterSpacing: "0.03em", border: "none", transition: "all 0.25s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            marginBottom: 12,
            background: pedido.pagado
              ? "linear-gradient(135deg, #4F6867 0%, #3D5655 100%)"
              : "rgba(162,194,208,0.12)",
            color: pedido.pagado ? "#fff" : "#4F6867",
            boxShadow: pedido.pagado
              ? "0 2px 12px rgba(79,104,103,0.25)"
              : "inset 0 0 0 1.5px rgba(162,194,208,0.35)",
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          {pedido.pagado ? "Pagado" : "Marcar como pagado"}
        </button>

        {/* PRODUCTS SECTION */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {editingProductos ? (
            <div style={{ background: "#F5F5F5", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ fontSize: 10, color: "#4F6867", margin: "0 0 8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Modificar productos
              </p>
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
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={async () => {
                    const ok = await onSaveProducts(pedido, editLineas);
                    if (ok) { setEditingProductos(false); setEditLineas([]); setEditSearchProd(""); }
                  }}
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
                {pedido.productos && Array.isArray(pedido.productos) && pedido.productos.length > 0 ? (
                  <>
                    {pedido.productos.map((item, i) => {
                      const precio = PRICE_MAP[(item.nombre || "").toLowerCase().trim()] || 0;
                      return (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "7px 0",
                          borderBottom: i < pedido.productos.length - 1 ? "1px solid rgba(162,194,208,0.15)" : "none",
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
                      const total = (pedido.productos || []).reduce((s, item) => {
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
                const initial = (pedido.productos || []).map(p => {
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

          {editingNotas?.pedidoId === pedido.id ? (
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
                <button onClick={async () => {
                    const ok = await onSaveNotas(pedido, editingNotas.newNotas);
                    if (ok) setEditingNotas(null);
                  }}
                  style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #4F6867, #3D5655)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Guardar
                </button>
                <button onClick={() => setEditingNotas(null)}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #A2C2D0", background: "transparent", color: "#A2C2D0", fontSize: 12, cursor: "pointer" }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : pedido.notas ? (
            <div onClick={() => setEditingNotas({ pedidoId: pedido.id, newNotas: pedido.notas || "" })}
              style={{ fontSize: 12, color: "#1B1C39", fontStyle: "italic", padding: "10px 14px", background: "rgba(239,233,228,0.5)", borderRadius: 12, overflowWrap: "break-word", wordBreak: "break-word", border: "1px solid rgba(162,194,208,0.12)", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#A2C2D0"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(162,194,208,0.12)"}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#A2C2D0", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4, fontStyle: "normal" }}>Notas</span>
              {pedido.notas}
            </div>
          ) : null}

          {/* ESTADO CHANGE */}
          {(ESTADO_TRANSITIONS[pedido.estado] || []).length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {(ESTADO_TRANSITIONS[pedido.estado] || []).map((est, i) => {
                const cfg = ESTADOS[est];
                const isPrimary = i === 0;
                return (
                  <button className="estado-btn" key={est} onClick={() => onEstadoChange(pedido, est)}
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

          {/* ACTIONS SECTION */}
          <div style={{ borderTop: "1px solid rgba(162,194,208,0.15)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <a href={`https://www.notion.so/${pedido.id.replace(/-/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, textDecoration: "none", color: "#4F6867", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(225,242,252,0.5)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <I.Ext s={15} /> Ver en Notion
            </a>

            {editingFecha?.pedidoId === pedido.id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
                <input type="date" lang="es" value={editingFecha.newFecha}
                  onChange={e => setEditingFecha(ef => ({ ...ef, newFecha: e.target.value }))}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #A2C2D0", fontSize: 13, fontFamily: "'Roboto Condensed', sans-serif" }} />
                <button onClick={async () => {
                    const ok = await onChangeFecha(pedido, editingFecha.newFecha);
                    if (ok) setEditingFecha(null);
                  }}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #4F6867, #3D5655)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Guardar
                </button>
                <button onClick={() => setEditingFecha(null)}
                  style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #A2C2D0", background: "transparent", color: "#A2C2D0", fontSize: 12, cursor: "pointer" }}>
                  ×
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingFecha({ pedidoId: pedido.id, newFecha: (pedido.fecha || "").split("T")[0] || fmt.todayISO() })}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "none", background: "transparent", color: "#4F6867", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "100%", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(225,242,252,0.5)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <I.Cal s={15} /> Cambiar fecha de entrega
              </button>
            )}

            <button onClick={() => setEditingNotas({ pedidoId: pedido.id, newNotas: pedido.notas || "" })}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "none", background: "transparent", color: "#4F6867", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "100%", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(225,242,252,0.5)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span style={{ fontSize: 14 }}>📝</span> {pedido.notas ? "Editar notas" : "Añadir notas"}
            </button>

            <div style={{ height: 1, background: "rgba(162,194,208,0.12)", margin: "2px 12px" }} />

            {confirmCancel === pedido.id ? (
              <div style={{ background: "#FDE8E5", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", animation: "popoverIn 0.15s ease-out" }}>
                <span style={{ fontSize: 13, color: "#C62828", fontWeight: 600 }}>¿Cancelar?</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onCancel(pedido)}
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
              <button onClick={() => setConfirmCancel(pedido.id)}
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
  );
}
