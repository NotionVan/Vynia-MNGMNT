import { useState } from "react";
import I from "./Icons.jsx";
import HELP_CONTENT from "../constants/helpContent.jsx";

const BENTO_COLORS = {
  pedidos: { bg: "linear-gradient(135deg, #E1F2FC 0%, #d0e8f7 100%)", accent: "#1565C0", border: "rgba(21,101,192,0.15)" },
  nuevo: { bg: "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)", accent: "#2E7D32", border: "rgba(46,125,50,0.15)" },
  produccion: { bg: "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)", accent: "#E65100", border: "rgba(230,81,0,0.15)" },
  seguimiento: { bg: "linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)", accent: "#7B1FA2", border: "rgba(123,31,162,0.15)" },
  general: { bg: "linear-gradient(135deg, #EFE9E4 0%, #E0D6CC 100%)", accent: "#4F6867", border: "rgba(79,104,103,0.15)" },
};

export default function HelpOverlay({ initialCategory, onClose }) {
  const [helpActiveCategory, setHelpActiveCategory] = useState(initialCategory || null);
  const [helpExpanded, setHelpExpanded] = useState(new Set());

  const activeCat = HELP_CONTENT.find(c => c.id === helpActiveCategory);
  const toggleSection = (key) => {
    setHelpExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div data-help-overlay style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(27,28,57,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}>
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
          <button onClick={onClose} style={{
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
}
