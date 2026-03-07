import I from "./Icons.jsx";
import { fmt } from "../utils/fmt.js";

export default function ParseWhatsAppModal({
  parseText, setParseText,
  parseImage, setParseImage,
  parseResult, setParseResult,
  parseError, setParseError,
  parseLoading,
  parseFileRef,
  onClose,
  onAnalyze,
  onApply,
  onToggleListening,
  handleParsePaste,
  handleParseDrop,
  handleParseImageFile,
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(27,28,57,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={() => { if (!parseLoading) onClose(); }}>
      <div style={{
        background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRadius: 20, padding: "24px 20px 20px", maxWidth: 480, width: "100%",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)", animation: "popoverIn 0.2s ease-out",
        maxHeight: "85vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #4F6867, #1B1C39)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 3px 10px rgba(79,104,103,0.3)",
            flexShrink: 0,
          }}>
            <I.Clipboard s={20} c="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif" }}>Pegar pedido</div>
            <div style={{ fontSize: 12, color: "#888" }}>Texto, imagen o dictado por voz</div>
          </div>
        </div>

        {/* Error state */}
        {parseError && (
          <div style={{ background: "#FFF3E0", border: "1px solid #E65100", borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "#E65100" }}>
            {parseError}
          </div>
        )}

        {/* Input phase */}
        {!parseResult && (
          <div onPaste={handleParsePaste}>
            {/* Image preview */}
            {parseImage && (
              <div style={{ position: "relative", marginBottom: 10, borderRadius: 12, overflow: "hidden", background: "#F8F6F3", border: "1.5px solid #E8E0D4" }}>
                <img src={parseImage.dataUrl} alt="Captura" style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block" }} />
                <button onClick={() => setParseImage(null)} disabled={parseLoading}
                  style={{
                    position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", fontSize: 16,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    lineHeight: 1,
                  }}>×</button>
                <div style={{ padding: "6px 12px", fontSize: 11, color: "#888", background: "#F8F6F3" }}>
                  {parseImage.fileName || "Imagen pegada"}
                </div>
              </div>
            )}

            {/* Drop zone + file input (when no image) */}
            {!parseImage && (
              <div
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#4F6867"; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = "#A2C2D0"; }}
                onDrop={handleParseDrop}
                onClick={() => parseFileRef.current?.click()}
                style={{
                  border: "2px dashed #A2C2D0", borderRadius: 12, padding: "16px 14px",
                  textAlign: "center", cursor: "pointer", marginBottom: 10,
                  background: "#F8F6F3", transition: "border-color 0.15s",
                }}
              >
                <div style={{ marginBottom: 4, color: "#4F6867" }}><I.Img s={32} /></div>
                <div style={{ fontSize: 13, color: "#4F6867", fontWeight: 600 }}>Arrastra una captura o pulsa para seleccionar</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Tambien puedes pegar con Cmd+V / Ctrl+V</div>
                <input ref={parseFileRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.[0]) handleParseImageFile(e.target.files[0]); e.target.value = ""; }} />
              </div>
            )}

            {/* Mic dictation button */}
            <button
              onClick={onToggleListening}
              disabled={parseLoading}
              title="Dictar con microfono"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 10,
                border: "1.5px solid #A2C2D0",
                background: "transparent",
                color: "#4F6867",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s", marginBottom: 8, width: "100%",
                justifyContent: "center",
              }}
            >
              <I.Mic s={16} c="#4F6867" /> Dictar (reproduce el audio y escucha)
            </button>

            {/* Textarea */}
            <textarea
              value={parseText}
              onChange={e => setParseText(e.target.value)}
              placeholder={parseImage ? "Contexto adicional (opcional)..." : "O pega aqui el texto del mensaje..."}
              rows={parseImage ? 3 : 6}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: "1.5px solid #E8E0D4", fontSize: 14, background: "#EFE9E4",
                outline: "none", resize: "vertical", fontFamily: "Inter, sans-serif",
                lineHeight: 1.5, boxSizing: "border-box",
              }}
              onFocus={e => { e.target.style.borderColor = "#4F6867"; }}
              onBlur={e => { e.target.style.borderColor = "#E8E0D4"; }}
              disabled={parseLoading}
              autoFocus={!parseImage}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={onClose} disabled={parseLoading}
                style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid #ccc", background: "transparent", color: "#666", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={onAnalyze} disabled={(!parseText.trim() && !parseImage) || parseLoading}
                style={{
                  padding: "10px 22px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  background: (!parseText.trim() && !parseImage) || parseLoading ? "#A2C2D0" : "linear-gradient(135deg, #4F6867, #1B1C39)",
                  color: "#fff", display: "flex", alignItems: "center", gap: 8,
                  fontFamily: "'Roboto Condensed', sans-serif",
                  boxShadow: (!parseText.trim() && !parseImage) || parseLoading ? "none" : "0 3px 12px rgba(79,104,103,0.35)",
                  transition: "all 0.2s",
                }}>
                {parseLoading ? (
                  <><img src="/logo-loader.png" alt="" style={{ display: "inline-block", width: 16, height: 16, borderRadius: "50%", verticalAlign: "middle", animation: "logoSpin 2s linear infinite", filter: "brightness(2.5)" }} /> Analizando...</>
                ) : "Analizar"}
              </button>
            </div>
          </div>
        )}

        {/* Result preview phase */}
        {parseResult && (
          <>
            {/* Confidence badge */}
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
                background: parseResult.confidence === "high" ? "#E8F5E9" : parseResult.confidence === "medium" ? "#FFF3E0" : "#FFEBEE",
                color: parseResult.confidence === "high" ? "#2E7D32" : parseResult.confidence === "medium" ? "#E65100" : "#C62828",
              }}>
                {parseResult.confidence === "high" ? "Alta confianza" : parseResult.confidence === "medium" ? "Confianza media" : "Baja confianza"}
              </span>
            </div>

            {/* Detected info */}
            <div style={{ background: "#F8F6F3", borderRadius: 12, padding: "12px 14px", marginBottom: 12, fontSize: 13 }}>
              {parseResult.cliente && (
                <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cliente:</span>
                  <strong>{parseResult.cliente}</strong>
                  {parseResult.clienteExiste ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: "#2E7D32", color: "#fff" }}>EN BD</span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 6, background: "#E65100", color: "#fff" }}>NUEVO</span>
                  )}
                </div>
              )}
              {parseResult.telefono && (
                <div style={{ marginBottom: 6 }}><span style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Teléfono:</span> <strong>{parseResult.telefono}</strong></div>
              )}
              {parseResult.fecha && (
                <div style={{ marginBottom: 6 }}><span style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fecha:</span> <strong>{fmt.date(parseResult.fecha)}{parseResult.hora ? ` a las ${parseResult.hora}` : ""}</strong></div>
              )}
              {parseResult.notas && (
                <div><span style={{ color: "#888", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notas:</span> <strong>{parseResult.notas}</strong></div>
              )}
              {!parseResult.cliente && !parseResult.telefono && !parseResult.fecha && !parseResult.notas && (
                <div style={{ color: "#888" }}>No se detectaron datos del cliente</div>
              )}
            </div>

            {/* Products */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.07em", color: "#4F6867", fontWeight: 700, marginBottom: 8 }}>
                Productos detectados
              </div>
              {parseResult.lineas.length > 0 ? parseResult.lineas.map((l, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", background: l.matched ? "#E8F5E9" : "#FFEBEE",
                  borderRadius: 10, marginBottom: 4, fontSize: 13,
                }}>
                  <span style={{ fontWeight: 600 }}>{l.nombre}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700 }}>x{l.cantidad}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                      background: l.matched ? "#2E7D32" : "#C62828", color: "#fff",
                    }}>{l.matched ? "OK" : "?"}</span>
                  </span>
                </div>
              )) : (
                <div style={{ color: "#888", fontSize: 13, padding: "8px 0" }}>No se detectaron productos</div>
              )}
            </div>

            {/* Warnings */}
            {parseResult.warnings?.length > 0 && (
              <div style={{ background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "#F57F17" }}>
                {parseResult.warnings.map((w, i) => (
                  <div key={i} style={{ marginBottom: i < parseResult.warnings.length - 1 ? 4 : 0, display: "flex", alignItems: "center", gap: 6 }}>
                    <I.AlertTri s={13} c="#F57F17" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setParseResult(null); setParseError(null); }}
                style={{ padding: "10px 20px", borderRadius: 12, border: "1px solid #ccc", background: "transparent", color: "#666", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Volver
              </button>
              <button onClick={() => onApply(parseResult)}
                disabled={parseResult.lineas.filter(l => l.matched).length === 0}
                style={{
                  padding: "10px 22px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  background: parseResult.lineas.filter(l => l.matched).length === 0 ? "#A2C2D0" : "linear-gradient(135deg, #4F6867, #1B1C39)",
                  color: "#fff", fontFamily: "'Roboto Condensed', sans-serif",
                  boxShadow: parseResult.lineas.filter(l => l.matched).length === 0 ? "none" : "0 3px 12px rgba(79,104,103,0.35)",
                  transition: "all 0.2s",
                }}>
                Aplicar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
