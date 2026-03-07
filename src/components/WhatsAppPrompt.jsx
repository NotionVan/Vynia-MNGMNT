import I from "./Icons.jsx";

export default function WhatsAppPrompt({ prompt, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(27,28,57,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{
        background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRadius: 20, padding: "28px 24px 20px", maxWidth: 320, width: "90%",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)", textAlign: "center",
        animation: "popoverIn 0.2s ease-out",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #25D366, #128C7E)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", boxShadow: "0 3px 10px rgba(37,211,102,0.3)" }}><I.Phone s={24} c="#fff" /></div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1B1C39", marginBottom: 6 }}>¿Avisar al cliente?</div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 20, lineHeight: 1.4 }}>
          Se abrirá WhatsApp para enviar un mensaje a <strong>{prompt.nombre}</strong>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onClose}
            style={{ padding: "10px 22px", borderRadius: 12, border: "1px solid #ccc", background: "transparent", color: "#666", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            No
          </button>
          <button onClick={() => {
            const tel = prompt.tel.replace(/\D/g, "");
            const num = tel.startsWith("34") ? tel : `34${tel}`;
            const msg = encodeURIComponent("¡Hola! Tu pedido de Vynia ya está listo para que pases a recogerlo.");
            window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
            onClose();
          }}
            style={{ padding: "10px 22px", borderRadius: 12, border: "none", background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            Sí, avisar
          </button>
        </div>
      </div>
    </div>
  );
}
