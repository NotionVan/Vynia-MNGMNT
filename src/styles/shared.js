// ─── SHARED INLINE STYLES (used by form sections) ───

export const labelStyle = {
  fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em",
  color: "#4F6867", fontWeight: 700,
  display: "flex", alignItems: "center", gap: 6,
  marginBottom: 2,
};

export const inputStyle = {
  width: "100%", padding: "13px 16px", borderRadius: 14,
  border: "1.5px solid rgba(162,194,208,0.25)", fontSize: 14,
  background: "rgba(239,233,228,0.35)", outline: "none",
  color: "#1B1C39", boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
};

export const formSectionStyle = {
  position: "relative", overflow: "hidden",
  background: "radial-gradient(120% 120% at 20% 0%, rgba(255,255,255,0.97) 0%, rgba(225,242,252,0.25) 100%)",
  borderRadius: 20, padding: "20px 18px",
  border: "1px solid rgba(162,194,208,0.15)",
  boxShadow: "0 4px 24px rgba(79,104,103,0.07), 0 1px 3px rgba(0,0,0,0.04)",
};
