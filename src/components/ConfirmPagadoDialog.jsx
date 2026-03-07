export default function ConfirmPagadoDialog({ pending, onConfirm, onCancel }) {
  const willPay = !pending.pedido?.pagado;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(27,28,57,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onCancel}>
      <div style={{
        background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRadius: 20, padding: "28px 24px 20px", maxWidth: 320, width: "90%",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)", textAlign: "center",
        animation: "popoverIn 0.18s ease-out",
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: willPay ? "#E1F2FC" : "rgba(162,194,208,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px", fontSize: 22, color: willPay ? "#3D5655" : "#A2C2D0",
        }}>
          €
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#1B1C39", margin: "0 0 6px", fontFamily: "'Roboto Condensed', sans-serif" }}>
          {willPay ? "¿Marcar como pagado?" : "¿Desmarcar como pagado?"}
        </p>
        <p style={{ fontSize: 13, color: "#4F6867", margin: "0 0 20px" }}>
          {pending.pedido?.cliente || pending.pedido?.nombre || "Pedido"} → <strong style={{ color: willPay ? "#2E7D32" : "#C62828" }}>{willPay ? "Pagado" : "No pagado"}</strong>
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 12,
              border: "1.5px solid rgba(162,194,208,0.3)", background: "transparent",
              color: "#4F6867", fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Roboto Condensed', sans-serif",
            }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 12,
              border: "none",
              background: willPay ? "linear-gradient(135deg, #2E7D32ee, #2E7D32cc)" : "linear-gradient(135deg, #C62828ee, #C62828cc)",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Roboto Condensed', sans-serif",
              boxShadow: willPay ? "0 3px 12px #2E7D3235" : "0 3px 12px #C6282835",
            }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
