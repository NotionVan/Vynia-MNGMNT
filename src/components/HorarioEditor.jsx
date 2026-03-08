import { useState, useEffect, useRef, useCallback } from "react";
import I from "./Icons.jsx";
import { saveHorarioDia } from "../utils/horario.js";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// status: "idle" | "saving" | "saved" | "error"
export default function HorarioEditor({ horario, lastEdited, onSave, onClose }) {
  const [local, setLocal] = useState(() => {
    if (!horario || Object.keys(horario).length === 0) {
      const def = {};
      for (let i = 0; i < 7; i++) def[i] = { abierto: i < 5, apertura: "09:00", cierre: "14:00", apertura2: null, cierre2: null };
      return def;
    }
    const copy = {};
    for (const [k, v] of Object.entries(horario)) copy[k] = { ...v };
    return copy;
  });

  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const pendingRef = useRef(null); // { dia, changes, localSnapshot }
  const timerRef = useRef(null);

  // Sync when parent horario changes (e.g., from Notion fetch)
  useEffect(() => {
    if (horario && Object.keys(horario).length > 0) {
      const copy = {};
      for (const [k, v] of Object.entries(horario)) copy[k] = { ...v };
      setLocal(copy);
    }
  }, [horario]);

  // Flush pending save to Notion (debounced 600ms)
  const flushSave = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;

    setSaveStatus("saving");
    try {
      await saveHorarioDia(pending.localSnapshot, pending.dia, pending.changes);
      setSaveStatus("saved");
    } catch (err) {
      console.warn("Failed to save horario to Notion:", err.message);
      setSaveStatus("error");
    }
  }, []);

  // Cleanup timer on unmount + flush pending
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      // Flush on unmount if pending
      if (pendingRef.current) flushSave();
    };
  }, [flushSave]);

  const updateDay = (dia, changes) => {
    // Optimistic local update
    const updated = { ...local };
    updated[dia] = { ...(updated[dia] || {}), ...changes };
    setLocal(updated);
    onSave(updated);

    // Queue debounced save
    pendingRef.current = { dia, changes, localSnapshot: updated };
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushSave, 600);
  };

  const formatLastEdited = () => {
    if (!lastEdited) return null;
    try {
      return new Date(lastEdited).toLocaleDateString("es-ES", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return null; }
  };

  const statusConfig = {
    idle:   { bg: "rgba(162,194,208,0.1)", border: "rgba(162,194,208,0.2)", color: "#A2C2D0", icon: <I.Clock s={14} c="#A2C2D0" />, text: "Guardado automatico" },
    saving: { bg: "rgba(21,101,192,0.08)", border: "rgba(21,101,192,0.2)", color: "#1565C0", icon: <I.Clock s={14} c="#1565C0" />, text: "Guardando en Notion..." },
    saved:  { bg: "rgba(46,125,50,0.08)", border: "rgba(46,125,50,0.2)", color: "#2E7D32", icon: <I.Check s={14} c="#2E7D32" />, text: "Guardado en Notion" },
    error:  { bg: "rgba(198,40,40,0.08)", border: "rgba(198,40,40,0.2)", color: "#C62828", icon: <I.AlertTri s={14} c="#C62828" />, text: "Error al guardar — reintenta" },
  };
  const st = statusConfig[saveStatus];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 400,
      background: "rgba(27,28,57,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRadius: 20, width: "100%", maxWidth: 540,
        maxHeight: "92vh", display: "flex", flexDirection: "column",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        animation: "helpSlideUp 0.28s ease-out",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: "18px 20px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, borderBottom: "1px solid rgba(162,194,208,0.15)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#4F6867", display: "flex" }}><I.Clock s={20} /></span>
            <h2 style={{
              margin: 0, fontSize: 18, fontWeight: 800, color: "#1B1C39",
              fontFamily: "'Roboto Condensed', sans-serif",
            }}>Horario del Negocio</h2>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "rgba(162,194,208,0.2)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#4F6867", fontWeight: 700,
          }}>&#10005;</button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", padding: "16px 20px 20px", flex: 1 }}>
          {formatLastEdited() && (
            <div style={{
              fontSize: 11, color: "#A2C2D0", marginBottom: 14, fontWeight: 500,
            }}>
              Ultima actualizacion: {formatLastEdited()}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DIAS.map((nombre, i) => {
              const day = local[i] || { abierto: false, apertura: "", cierre: "", apertura2: null, cierre2: null };
              const hasTramo2 = day.apertura2 && day.cierre2;
              const tramo2Invalid = day.apertura2 && day.cierre && day.apertura2 < day.cierre;

              return (
                <div key={i} style={{
                  background: day.abierto ? "rgba(225,242,252,0.4)" : "rgba(239,233,228,0.5)",
                  borderRadius: 14, padding: "12px 14px",
                  border: `1px solid ${day.abierto ? "rgba(79,104,103,0.15)" : "rgba(162,194,208,0.15)"}`,
                  transition: "all 0.2s",
                }}>
                  {/* Day name + toggle */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700, color: day.abierto ? "#1B1C39" : "#A2C2D0",
                      fontFamily: "'Roboto Condensed', sans-serif",
                      transition: "color 0.2s",
                    }}>{nombre}</span>

                    {/* Toggle switch */}
                    <button
                      title={day.abierto ? "Marcar como cerrado" : "Marcar como abierto"}
                      onClick={() => updateDay(i, { abierto: !day.abierto })}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: "none",
                        background: day.abierto ? "#4F6867" : "#A2C2D0",
                        cursor: "pointer", position: "relative",
                        transition: "background 0.2s",
                      }}
                    >
                      <span style={{
                        position: "absolute",
                        top: 3, left: day.abierto ? 23 : 3,
                        width: 18, height: 18, borderRadius: "50%",
                        background: "#fff",
                        transition: "left 0.2s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                      }} />
                    </button>
                  </div>

                  {/* Time inputs — only if open */}
                  {day.abierto && (
                    <div style={{ marginTop: 10 }}>
                      {/* Tramo 1 */}
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <label style={{ fontSize: 11, color: "#4F6867", fontWeight: 600, width: 52, flexShrink: 0 }}>Tramo 1</label>
                        <input type="time" value={day.apertura || ""} onChange={e => updateDay(i, { apertura: e.target.value })}
                          style={timeInputStyle} />
                        <span style={{ fontSize: 11, color: "#A2C2D0" }}>a</span>
                        <input type="time" value={day.cierre || ""} onChange={e => updateDay(i, { cierre: e.target.value })}
                          style={timeInputStyle} />
                      </div>

                      {/* Tramo 2 */}
                      {hasTramo2 ? (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <label style={{ fontSize: 11, color: "#4F6867", fontWeight: 600, width: 52, flexShrink: 0 }}>Tramo 2</label>
                            <input type="time" value={day.apertura2 || ""} onChange={e => updateDay(i, { apertura2: e.target.value })}
                              style={{
                                ...timeInputStyle,
                                borderColor: tramo2Invalid ? "#C62828" : "rgba(162,194,208,0.4)",
                              }} />
                            <span style={{ fontSize: 11, color: "#A2C2D0" }}>a</span>
                            <input type="time" value={day.cierre2 || ""} onChange={e => updateDay(i, { cierre2: e.target.value })}
                              style={timeInputStyle} />
                            <button
                              title="Eliminar segundo tramo"
                              onClick={() => updateDay(i, { apertura2: "", cierre2: "" })}
                              style={{
                                width: 24, height: 24, borderRadius: 6,
                                border: "none", background: "rgba(198,40,40,0.08)",
                                color: "#C62828", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, fontWeight: 700, flexShrink: 0,
                              }}
                            >&#10005;</button>
                          </div>
                          {tramo2Invalid && (
                            <div style={{
                              fontSize: 10, color: "#C62828", marginTop: 4, marginLeft: 60,
                            }}>
                              El segundo tramo debe empezar despues del cierre del primero
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => updateDay(i, { apertura2: day.cierre || "17:00", cierre2: "19:00" })}
                          style={{
                            marginTop: 8, padding: "6px 12px", borderRadius: 8,
                            border: "1px dashed rgba(79,104,103,0.3)",
                            background: "transparent", color: "#4F6867",
                            fontSize: 11, fontWeight: 600, cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 4,
                          }}
                        >
                          <I.Plus s={12} /> Anadir segundo tramo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer — dynamic save status */}
          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: 10,
            background: st.bg, border: `1px solid ${st.border}`,
            fontSize: 11, color: st.color, fontWeight: 600,
            textAlign: "center",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.2s",
          }}>
            {st.icon}
            {st.text}
          </div>
        </div>
      </div>
    </div>
  );
}

const timeInputStyle = {
  flex: 1, padding: "6px 8px", borderRadius: 8,
  border: "1px solid rgba(162,194,208,0.4)",
  background: "#fff", fontSize: 13, fontWeight: 500,
  color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif",
  outline: "none", maxWidth: 90, textAlign: "center",
};
