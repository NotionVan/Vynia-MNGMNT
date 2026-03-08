import { useState, useRef, useEffect } from "react";
import { fmt } from "../utils/fmt.js";
import I from "../components/Icons.jsx";

export default function useGlassCalendar() {
  const [glassCalTarget, setGlassCalTarget] = useState(null);
  const [glassCalMonth, setGlassCalMonth] = useState(null);
  const glassCalRef = useRef(null);

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

  // Auto-scroll to selected day
  useEffect(() => {
    if (glassCalTarget) {
      const el = document.getElementById(`gcal-sel-${glassCalTarget}`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }), 60);
    }
  }, [glassCalTarget, glassCalMonth]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (glassCalRef.current && !glassCalRef.current.contains(e.target)) {
        setGlassCalTarget(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  return { glassCalTarget, setGlassCalTarget, openGlassCal, renderGlassCal };
}
