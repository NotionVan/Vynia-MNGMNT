import I from "./Icons.jsx";

export default function ListeningPopup({ listenText, listenError, onStop }) {
  return (
    <div className="listen-overlay" style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(27,28,57,0.75)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, animation: "popoverIn 0.25s ease-out",
    }}>
      {/* Mic icon with animated ring */}
      <div className="listen-ring" style={{
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(255,255,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, position: "relative",
      }}>
        <div className="listen-ring-pulse" style={{
          position: "absolute", inset: -8, borderRadius: "50%",
          border: "2.5px solid rgba(255,255,255,0.25)",
        }} />
        <I.Mic s={36} c="#fff" />
      </div>

      <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, fontFamily: "'Roboto Condensed', sans-serif", marginBottom: 6, textAlign: "center" }}>
        Escuchando...
      </div>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 20, textAlign: "center" }}>
        Reproduce el audio de WhatsApp cerca del microfono
      </div>

      {/* Error shown inside popup */}
      {listenError && (
        <div style={{
          background: "rgba(198,40,40,0.25)", border: "1px solid rgba(198,40,40,0.5)",
          borderRadius: 12, padding: "10px 16px", maxWidth: 340, width: "100%",
          color: "#ffcccc", fontSize: 13, lineHeight: 1.5,
          marginBottom: 16, textAlign: "center",
        }}>
          {listenError}
        </div>
      )}

      {/* CSS equalizer bars */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, height: 48, marginBottom: 16 }}>
        {[0, 0.15, 0.3, 0.05, 0.25, 0.4, 0.1, 0.35].map((d, i) => (
          <div key={i} className="eq-bar" style={{ width: 4, borderRadius: 2, background: "rgba(255,255,255,0.6)", animationDelay: `${d}s` }} />
        ))}
      </div>

      {/* Live transcript preview */}
      {listenText && (
        <div style={{
          background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "10px 16px",
          maxWidth: 340, width: "100%", maxHeight: 100, overflowY: "auto",
          color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.5,
          marginBottom: 16, textAlign: "center",
        }}>
          {listenText.length > 150 ? "..." + listenText.slice(-150) : listenText}
        </div>
      )}

      {/* Stop button */}
      <button onClick={onStop} style={{
        padding: "12px 32px", borderRadius: 14, border: "2px solid rgba(255,255,255,0.3)",
        background: "rgba(198,40,40,0.85)", color: "#fff",
        fontSize: 15, fontWeight: 700, cursor: "pointer",
        fontFamily: "'Roboto Condensed', sans-serif",
        boxShadow: "0 4px 20px rgba(198,40,40,0.4)",
        display: "flex", alignItems: "center", gap: 8,
        transition: "all 0.2s",
      }}>
        <I.Mic s={18} c="#fff" /> Parar
      </button>
    </div>
  );
}
