import { useState, useRef, useMemo, useEffect } from "react";
import NumberFlow from "@number-flow/react";
import I from "./Icons.jsx";
import { notion } from "../api.js";
import { FRECUENTES } from "../constants/catalogo.js";
import { fmt, DAY_NAMES } from "../utils/fmt.js";
import { computeDateSuggestions } from "../utils/helpers.js";
import { labelStyle, inputStyle, formSectionStyle } from "../styles/shared.js";
import ParseWhatsAppModal from "./ParseWhatsAppModal.jsx";
import ListeningPopup from "./ListeningPopup.jsx";
import { useVynia } from "../context/VyniaContext.jsx";

export default function TabNuevo({ onCreatePedido, onViewOrder }) {
  const { isDesktop, apiMode, catalogo, notify } = useVynia();
  // ─── State ───
  const [cliente, setCliente] = useState("");
  const [clienteSuggestions, setClienteSuggestions] = useState([]);
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [telefono, setTelefono] = useState("");
  const [fecha, setFecha] = useState(fmt.todayISO());
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");
  const [pagado, setPagado] = useState(false);
  const [lineas, setLineas] = useState([]);
  const [searchProd, setSearchProd] = useState("");
  const [showCatFull, setShowCatFull] = useState(false);
  const [dateSuggestions, setDateSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [nuevoPaso, setNuevoPaso] = useState(1);
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseText, setParseText] = useState("");
  const [parseImage, setParseImage] = useState(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [listenText, setListenText] = useState("");
  const [listenError, setListenError] = useState("");

  // ─── Refs ───
  const searchRef = useRef(null);
  const clienteWrapperRef = useRef(null);
  const clienteSearchTimer = useRef(null);
  const parseFileRef = useRef(null);
  const speechRecRef = useRef(null);
  const isListeningRef = useRef(false);

  // ─── Computed ───
  const productosFiltrados = useMemo(() => {
    if (!searchProd) return [];
    const q = searchProd.toLowerCase();
    return catalogo.filter(p => p.nombre.toLowerCase().includes(q));
  }, [searchProd, catalogo]);

  const totalPedido = lineas.reduce((s, l) => s + l.cantidad * l.precio, 0);
  const totalItems = lineas.reduce((s, l) => s + l.cantidad, 0);

  // ─── Click outside to close client suggestions ───
  useEffect(() => {
    const handler = (e) => {
      if (clienteWrapperRef.current && !clienteWrapperRef.current.contains(e.target)) {
        setClienteSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Handlers ───
  const resetForm = () => {
    setNuevoPaso(1);
    setCliente(""); setTelefono(""); setFecha(fmt.todayISO());
    setHora(""); setNotas(""); setPagado(false); setLineas([]);
    setSearchProd(""); setShowCatFull(false);
    setClienteSuggestions([]); setSelectedClienteId(null);
    setDateSuggestions([]); setSuggestionsLoading(false);
  };

  const onClienteChange = (val) => {
    setCliente(val);
    setSelectedClienteId(null);
    if (clienteSearchTimer.current) clearTimeout(clienteSearchTimer.current);
    if (apiMode === "demo" || val.trim().length < 2) {
      setClienteSuggestions([]);
      return;
    }
    clienteSearchTimer.current = setTimeout(async () => {
      try {
        const results = await notion.searchClientes(val.trim());
        setClienteSuggestions(Array.isArray(results) ? results : []);
      } catch { setClienteSuggestions([]); }
    }, 300);
  };

  const selectCliente = (c) => {
    setCliente(c.nombre);
    setSelectedClienteId(c.id);
    if (c.telefono) setTelefono(c.telefono);
    setClienteSuggestions([]);
  };

  const addProducto = (prod) => {
    const existing = lineas.find(l => l.nombre === prod.nombre);
    if (existing) {
      setLineas(lineas.map(l => l.nombre === prod.nombre ? { ...l, cantidad: l.cantidad + 1 } : l));
    } else {
      setLineas([...lineas, { nombre: prod.nombre, precio: prod.precio, cantidad: 1, cat: prod.cat }]);
    }
    setSearchProd("");
    if (searchRef.current) searchRef.current.focus();
  };

  const updateQty = (nombre, delta) => {
    setLineas(ls => ls.map(l => l.nombre === nombre ? { ...l, cantidad: Math.max(0, l.cantidad + delta) } : l).filter(l => l.cantidad > 0));
  };

  // ─── Parse handlers ───
  const handleParseImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setParseImage({ dataUrl: e.target.result, fileName: file.name });
    reader.readAsDataURL(file);
  };
  const handleParsePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        handleParseImageFile(item.getAsFile());
        return;
      }
    }
  };
  const handleParseDrop = (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "#E8E0D4";
    const file = e.dataTransfer?.files?.[0];
    if (file) handleParseImageFile(file);
  };
  const handleParseOrder = async () => {
    const hasText = parseText.trim().length >= 5;
    const hasImage = !!parseImage;
    if ((!hasText && !hasImage) || parseLoading) return;
    setParseLoading(true);
    setParseError(null);
    setParseResult(null);
    try {
      const result = await notion.parseWhatsApp(
        hasText ? parseText.trim() : null,
        null, null,
        hasImage ? parseImage.dataUrl : null
      );
      if (result?.ok) setParseResult(result);
      else setParseError(result?.error || "Error desconocido");
    } catch (err) {
      setParseError(err.message || "Error al analizar el mensaje");
    } finally {
      setParseLoading(false);
    }
  };

  // ─── Listening handlers ───
  const stopListening = () => {
    isListeningRef.current = false;
    speechRecRef.current?.stop();
    setIsListening(false);
  };

  const toggleListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setParseError("Tu navegador no soporta dictado por voz. Usa Chrome.");
      return;
    }
    if (isListening) { stopListening(); return; }

    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      setParseError("Safari no soporta dictado de forma fiable. Abre la app en Chrome para usar esta funcion.");
      return;
    }

    setListenError("");
    setParseError(null);

    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;
    speechRecRef.current = rec;
    let finalTranscript = parseText;
    let fatalError = false;
    setListenText(parseText);

    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t;
        } else {
          interim += t;
        }
      }
      const full = finalTranscript + (interim ? " " + interim : "");
      setParseText(full);
      setListenText(full);
    };

    rec.onerror = (event) => {
      if (event.error === "aborted") return;
      if (event.error === "no-speech") return;
      fatalError = true;
      let msg;
      if (event.error === "not-allowed") {
        msg = "Microfono bloqueado. Pulsa el candado en la barra de direcciones, permite el microfono y recarga la pagina.";
      } else if (event.error === "network") {
        msg = "Sin conexion al servicio de voz de Google. Comprueba tu conexion a internet.";
      } else if (event.error === "service-not-allowed") {
        msg = "El servicio de reconocimiento de voz no esta disponible. Usa Chrome y permite el reconocimiento de voz en Ajustes.";
      } else {
        msg = "Error de dictado: " + event.error;
      }
      setListenError(msg);
      setParseError(msg);
    };

    rec.onend = () => {
      if (isListeningRef.current && !fatalError) {
        try { rec.start(); } catch { stopListening(); }
      } else {
        stopListening();
      }
    };

    try {
      rec.start();
    } catch (err) {
      setParseError("No se pudo iniciar el dictado: " + err.message);
      return;
    }

    isListeningRef.current = true;
    setIsListening(true);
  };

  // ─── Apply parsed order ───
  const aplicarParseo = (result) => {
    if (result.clienteId && result.clienteExiste) {
      setCliente(result.cliente || "");
      setSelectedClienteId(result.clienteId);
      setClienteSuggestions([]);
    } else if (result.cliente) {
      setCliente(result.cliente);
      setSelectedClienteId(null);
      if (apiMode !== "demo" && result.cliente.trim().length >= 2) {
        clearTimeout(clienteSearchTimer.current);
        clienteSearchTimer.current = setTimeout(async () => {
          try {
            const results = await notion.searchClientes(result.cliente.trim());
            setClienteSuggestions(Array.isArray(results) ? results : []);
          } catch { setClienteSuggestions([]); }
        }, 100);
      }
    }
    if (result.telefono) setTelefono(result.telefono);
    if (result.fecha) setFecha(result.fecha);
    if (result.hora) setHora(result.hora);
    if (result.notas) setNotas(result.notas);
    if (result.pagado != null) setPagado(result.pagado);

    const newLineas = (result.lineas || [])
      .filter(l => l.matched)
      .map(l => {
        const catItem = catalogo.find(c => c.nombre === l.nombre);
        return { nombre: l.nombre, cantidad: l.cantidad, precio: catItem?.precio || 0, cat: catItem?.cat || "" };
      });
    setLineas(newLineas);

    setShowParseModal(false);
    setCreateResult(null);
  };

  // ─── Create order (wraps parent callback) ───
  const crearPedido = async () => {
    if (!cliente.trim() || !fecha || lineas.length === 0) {
      notify("err", "Falta: cliente, fecha o productos");
      return;
    }
    const result = await onCreatePedido({ cliente: cliente.trim(), telefono, fecha, hora, pagado, notas, lineas, selectedClienteId });
    setCreateResult(result);
    if (result.status === "ok") resetForm();
  };

  // ─── View created order (wraps parent callback) ───
  const verPedidoCreado = (pedidoId) => {
    onViewOrder(pedidoId, createResult);
    setCreateResult(null);
  };

  // ─── Render ───
  return (
    <>
      {createResult ? (
        <div style={{ paddingTop: 16 }}>
          {createResult.status === "ok" ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              background: "#fff", borderRadius: 16, marginTop: 12,
              border: "1px solid #A2C2D0",
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "linear-gradient(135deg, #4F6867, #3D5655)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <I.Check s={32} />
              </div>
              <h2 style={{
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 22, fontWeight: 700, color: "#1B1C39", margin: "0 0 6px",
              }}>Pedido creado</h2>
              <p style={{ color: "#4F6867", fontSize: 14, margin: 0 }}>
                {createResult.cliente} — {createResult.total.toFixed(2)}€
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28 }}>
                <button onClick={() => verPedidoCreado(createResult.pedidoId)} style={{
                  padding: "11px 22px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", color: "#fff",
                  background: "linear-gradient(135deg, #4F6867, #3D5655)",
                  boxShadow: "0 2px 8px rgba(79,104,103,0.3)",
                }}>Ver pedido</button>
                <button onClick={() => setCreateResult(null)} style={{
                  padding: "11px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", color: "#4F6867",
                  border: "1.5px solid #A2C2D0", background: "transparent",
                }}>Crear otro</button>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              background: "#FDE8E5", borderRadius: 16, marginTop: 12,
              border: "1px solid #EF9A9A",
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "#C62828",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", color: "#fff", fontSize: 28, fontWeight: 800,
              }}>!</div>
              <h2 style={{
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 22, fontWeight: 700, color: "#C62828", margin: "0 0 6px",
              }}>No se pudo crear el pedido</h2>
              <p style={{ color: "#4F6867", fontSize: 13, margin: "0 0 4px", overflowWrap: "break-word" }}>
                {createResult.message}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 28 }}>
                <button onClick={() => setCreateResult(null)} style={{
                  padding: "11px 22px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", color: "#fff",
                  background: "#C62828",
                  boxShadow: "0 2px 8px rgba(198,40,40,0.3)",
                }}>Reintentar</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 16px" }}>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontSize: 22, fontWeight: 700,
              margin: 0, color: "#1B1C39",
            }}>Nuevo Pedido</h2>
            {nuevoPaso === 1 && (
              <button title="Pegar mensaje de WhatsApp" className="parse-btn"
                onClick={() => { setParseText(""); setParseImage(null); setParseResult(null); setParseError(null); setShowParseModal(true); }}
                style={{
                  position: "relative", overflow: "hidden",
                  padding: "10px 16px", borderRadius: 14,
                  border: "1.5px solid rgba(79,104,103,0.35)",
                  background: "linear-gradient(135deg, rgba(79,104,103,0.12), rgba(27,28,57,0.08))",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  transition: "all 0.3s ease-out",
                  boxShadow: "0 3px 12px rgba(79,104,103,0.12)",
                }}>
                <div className="parse-btn-shine" />
                <div style={{
                  padding: 7, borderRadius: 9,
                  background: "linear-gradient(135deg, rgba(79,104,103,0.5), rgba(79,104,103,0.3))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.3s",
                }}>
                  <I.Clipboard s={16} c="#fff" />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1B1C39", fontFamily: "'Roboto Condensed', sans-serif", lineHeight: 1.2 }}>Pegar pedido</div>
                  <div style={{ fontSize: 10, color: "#4F6867", opacity: 0.75 }}>Texto, imagen o voz</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F6867"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="parse-btn-arrow"
                  style={{ opacity: 0.35, transition: "all 0.3s" }}>
                  <path d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            )}
          </div>

          {nuevoPaso === 1 && (
          <>
            <div style={{
              display: isDesktop ? "grid" : "block",
              gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
              gap: isDesktop ? 16 : 0,
              alignItems: "start",
            }}>
              {/* ── Left column (desktop) ── */}
              <div>
                {/* ── Cliente ── */}
              <section style={{ ...formSectionStyle, marginBottom: 12 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #4F6867, #A2C2D0)", borderRadius: "20px 20px 0 0" }} />
                <label style={labelStyle}>
                  <I.User s={13} /> Cliente
                </label>
                <div ref={clienteWrapperRef} style={{ position: "relative" }}>
                  <input placeholder="Nombre del cliente" value={cliente}
                    onChange={e => onClienteChange(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") setClienteSuggestions([]); }}
                    autoComplete="off"
                    style={inputStyle} />
                  {clienteSuggestions.length > 0 && (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                      background: "rgba(239,233,228,0.88)",
                      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                      borderRadius: 14, marginTop: 4, padding: 3,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)",
                      maxHeight: 200, overflowY: "auto",
                      animation: "popoverIn 0.15s ease-out",
                    }}>
                      <div style={{
                        background: "rgba(255,255,255,0.95)", borderRadius: 12,
                        overflow: "hidden", border: "1px solid rgba(162,194,208,0.25)",
                      }}>
                        {clienteSuggestions.map(c => (
                          <button key={c.id} onClick={() => selectCliente(c)} style={{
                            display: "block", width: "100%", padding: "11px 14px",
                            border: "none", background: "transparent", cursor: "pointer",
                            textAlign: "left", fontSize: 13, transition: "background 0.15s",
                            borderBottom: "1px solid rgba(162,194,208,0.15)",
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                            <span style={{ fontWeight: 600, color: "#1B1C39" }}>{c.nombre}</span>
                            {c.telefono && (
                              <span style={{ fontSize: 11, color: "#A2C2D0", marginLeft: 8 }}>{c.telefono}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {selectedClienteId && (
                  <p style={{ fontSize: 10, color: "#4F6867", margin: "4px 0 0", fontWeight: 600 }}>
                    Cliente vinculado
                  </p>
                )}
                <input placeholder="Teléfono (opcional)" value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  type="tel"
                  style={{ ...inputStyle, marginTop: 8 }} />
                <p style={{ fontSize: 10, color: "#A2C2D0", margin: "6px 0 0" }}>
                  Si no existe, se creará automáticamente en Notion
                </p>
              </section>

                {/* ── Notas + Pagado ── */}
              <section style={{ ...formSectionStyle, marginBottom: 16 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #A2C2D0, #E1F2FC)", borderRadius: "20px 20px 0 0" }} />
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Notas</label>
                    <textarea value={notas} onChange={e => setNotas(e.target.value)}
                      placeholder="Notas del pedido..."
                      rows={2}
                      style={{
                        ...inputStyle, resize: "vertical",
                        fontFamily: "inherit", marginTop: 8,
                      }} />
                  </div>
                  <div style={{ textAlign: "center", paddingTop: 4 }}>
                    <label style={{ ...labelStyle, marginBottom: 8, display: "block" }}>Pagado</label>
                    <button title={pagado ? "Desmarcar como pagado" : "Marcar como pagado al reservar"} onClick={() => setPagado(!pagado)}
                      style={{
                        width: 52, height: 52, borderRadius: 14,
                        border: pagado ? "2.5px solid #4F6867" : "2px solid #A2C2D0",
                        background: pagado ? "#E1F2FC" : "transparent",
                        cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        color: pagado ? "#3D5655" : "#A2C2D0",
                        fontSize: 20, transition: "all 0.2s",
                      }}>
                      {pagado ? <I.Check s={22} /> : "€"}
                    </button>
                  </div>
                </div>
              </section>
              </div>
              {/* ── Right column (desktop) ── */}
              <div>
                {/* ── Productos ── */}
              <section style={{ ...formSectionStyle, marginBottom: 12 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #1B1C39, #4F6867)", borderRadius: "20px 20px 0 0" }} />
                <label style={labelStyle}>
                  <I.Box s={13} /> Productos
                </label>

                {/* Search bar */}
                <div style={{ position: "relative", marginTop: 8 }}>
                  <div style={{
                    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                    color: "#A2C2D0", pointerEvents: "none",
                  }}><I.Search s={16} /></div>
                  <input ref={searchRef}
                    placeholder="Buscar producto..."
                    value={searchProd}
                    onChange={e => setSearchProd(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 36 }} />
                </div>

                {/* Search results dropdown */}
                {searchProd && productosFiltrados.length > 0 && (
                  <div style={{
                    marginTop: 4, maxHeight: 220, overflowY: "auto",
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
                      {productosFiltrados.slice(0, 8).map((p, i) => (
                        <button key={p.nombre} onClick={() => addProducto(p)}
                          style={{
                            width: "100%", padding: "10px 14px",
                            border: "none",
                            borderBottom: i < productosFiltrados.length - 1 ? "1px solid rgba(162,194,208,0.15)" : "none",
                            background: "transparent", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            fontSize: 13, textAlign: "left", transition: "background 0.15s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = "#E1F2FC"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: "#4F6867", fontWeight: 700, fontSize: 15 }}>+</span>
                            <span style={{ fontWeight: 500 }}>{p.nombre}</span>
                            <span style={{
                              fontSize: 9, padding: "1px 5px", borderRadius: 3,
                              background: p.cat === "Panadería" ? "#E1F2FC" : "#E1F2FC",
                              color: p.cat === "Panadería" ? "#4F6867" : "#1B1C39",
                              fontWeight: 600,
                            }}>{p.cat === "Panadería" ? "PAN" : "PAST"}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: "#4F6867" }}>{p.precio.toFixed(2)}€</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick buttons */}
                {!searchProd && lineas.length === 0 && (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 10, color: "#A2C2D0", margin: "0 0 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Más pedidos:
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {FRECUENTES.map(name => {
                        const p = catalogo.find(c => c.nombre === name);
                        if (!p) return null;
                        return (
                          <button key={name} onClick={() => addProducto(p)}
                            style={{
                              padding: "7px 13px", borderRadius: 20, fontSize: 11,
                              border: "1px solid rgba(162,194,208,0.35)", background: "rgba(239,233,228,0.5)",
                              cursor: "pointer", color: "#1B1C39",
                              transition: "all 0.2s", fontWeight: 500,
                              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#E1F2FC"; e.currentTarget.style.borderColor = "#4F6867"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(79,104,103,0.12)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,233,228,0.5)"; e.currentTarget.style.borderColor = "rgba(162,194,208,0.35)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
                          >
                            + {name.length > 20 ? name.substring(0, 18) + "…" : name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Cart lines */}
                {lineas.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {lineas.map((l, i) => (
                      <div key={l.nombre} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 0",
                        borderBottom: i < lineas.length - 1 ? "1px solid #E1F2FC" : "none",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{l.nombre}</div>
                          <div style={{ fontSize: 11, color: "#4F6867" }}>{l.precio.toFixed(2)}€/ud</div>
                        </div>

                        {/* Quantity controls */}
                        <div style={{
                          display: "flex", alignItems: "center",
                          background: "#E1F2FC", borderRadius: 10, overflow: "hidden",
                        }}>
                          <button title="Quitar una unidad" onClick={() => updateQty(l.nombre, -1)}
                            style={{
                              width: 34, height: 34, border: "none", background: "transparent",
                              cursor: "pointer", display: "flex", alignItems: "center",
                              justifyContent: "center", color: "#4F6867",
                            }}><I.Minus /></button>
                          <NumberFlow
                            value={l.cantidad}
                            format={{ useGrouping: false }}
                            style={{
                              width: 28, textAlign: "center", fontSize: 15,
                              fontWeight: 800, color: "#1B1C39",
                              fontFamily: "'Roboto Condensed', sans-serif",
                            }}
                            willChange
                          />
                          <button title="Añadir una unidad" onClick={() => updateQty(l.nombre, 1)}
                            style={{
                              width: 34, height: 34, border: "none", background: "transparent",
                              cursor: "pointer", display: "flex", alignItems: "center",
                              justifyContent: "center", color: "#4F6867",
                            }}><I.Plus s={14} /></button>
                        </div>

                        <span style={{
                          minWidth: 52, textAlign: "right",
                          fontSize: 14, fontWeight: 700, color: "#4F6867",
                        }}>{(l.cantidad * l.precio).toFixed(2)}€</span>

                        <button title="Eliminar producto del pedido" onClick={() => setLineas(ls => ls.filter(x => x.nombre !== l.nombre))}
                          style={{
                            width: 30, height: 30, borderRadius: 8, border: "none",
                            background: "transparent", cursor: "pointer",
                            color: "#E57373", display: "flex",
                            alignItems: "center", justifyContent: "center",
                          }}><I.Trash /></button>
                      </div>
                    ))}

                    {/* Total bar */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 14px", marginTop: 8,
                      background: "linear-gradient(135deg, #E1F2FC, #E1F2FC)",
                      borderRadius: 12,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1B1C39" }}>
                        {totalItems} {totalItems === 1 ? "producto" : "productos"}
                      </span>
                      <span style={{
                        fontSize: 24, fontWeight: 800,
                        fontFamily: "'Roboto Condensed', sans-serif", color: "#1B1C39",
                      }}>{totalPedido.toFixed(2)}€</span>
                    </div>
                  </div>
                )}
              </section>
              </div>
            </div>{/* end 2-column grid */}

            {/* ── Submit Paso 1 ── */}
            <button title="Siguiente paso: elegir fecha" onClick={() => {
              setNuevoPaso(2);
              if (apiMode !== "demo" && lineas.length > 0) {
                setSuggestionsLoading(true);
                notion.loadProduccionRango(fmt.todayISO(), 7)
                  .then(data => setDateSuggestions(computeDateSuggestions(data.produccion || {}, lineas)))
                  .catch(() => setDateSuggestions([]))
                  .finally(() => setSuggestionsLoading(false));
              }
            }}
              disabled={!cliente.trim() || lineas.length === 0}
              style={{
                width: "100%", padding: "16px",
                borderRadius: 14, border: "none",
                background: (!cliente.trim() || lineas.length === 0)
                  ? "#A2C2D0"
                  : "linear-gradient(135deg, #4F6867, #1B1C39)",
                color: "#fff",
                fontSize: 16, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Roboto Condensed', sans-serif",
                boxShadow: (!cliente.trim() || lineas.length === 0)
                  ? "none" : "0 4px 16px rgba(166,119,38,0.35)",
                transition: "all 0.3s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                letterSpacing: "-0.01em",
              }}>
              Siguiente: Elegir fecha
            </button>
          </>
          )}

          {nuevoPaso === 2 && (
            <div>
              <button
                onClick={() => setNuevoPaso(1)}
                style={{
                  background: "transparent", border: "none", padding: "8px 0",
                  color: "#4F6867", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6, marginBottom: 12
                }}>
                <I.Back s={16} /> Volver a datos del pedido
              </button>

              {/* ── Sugerencias de fecha ── */}
              {(suggestionsLoading || dateSuggestions.length > 0) && (
                <section style={{ ...formSectionStyle, marginBottom: 12 }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #E1F2FC, #4F6867)", borderRadius: "20px 20px 0 0" }} />
                  <label style={{ ...labelStyle, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>&#128161;</span> Sugerencias de fecha
                  </label>
                  {suggestionsLoading ? (
                    <div style={{ textAlign: "center", padding: "8px 0", color: "#A2C2D0", fontSize: 12 }}>
                      Analizando produccion...
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {dateSuggestions.slice(0, 3).map(s => {
                        const d = new Date(s.date + "T12:00:00");
                        const dayName = DAY_NAMES[d.getDay()];
                        const isSelected = fecha === s.date;
                        return (
                          <button key={s.date} onClick={() => setFecha(s.date)}
                            title={`Seleccionar ${dayName} ${fmt.date(s.date)}: ${s.overlapping.map(p => p.nombre).join(", ")}`}
                            style={{
                              display: "flex", flexDirection: "column", gap: 2,
                              padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                              border: isSelected ? "2px solid #4F6867" : "1.5px solid #A2C2D0",
                              background: isSelected ? "#E1F2FC" : "#FAFAFA",
                              textAlign: "left", transition: "all 0.15s",
                            }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                              <span style={{
                                fontWeight: 700, fontSize: 13, color: "#1B1C39",
                                fontFamily: "'Roboto Condensed', sans-serif",
                              }}>
                                {dayName} {fmt.date(s.date)}
                              </span>
                              <span style={{
                                fontSize: 11, fontWeight: 600, color: "#4F6867",
                                background: "#E1F2FC", borderRadius: 6, padding: "2px 8px",
                              }}>
                                {s.overlapCount} {s.overlapCount === 1 ? "producto" : "productos"} en comun
                              </span>
                            </div>
                            <div style={{
                              fontSize: 11, color: "#A2C2D0", fontWeight: 500,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}>
                              {s.overlapping.map(p => `${p.nombre} (${p.totalUnidades}u)`).join(", ")}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* ── Fecha ── */}
              <section style={{ ...formSectionStyle, marginBottom: 12 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #4F6867, #1B1C39)", borderRadius: "20px 20px 0 0" }} />
                <label style={labelStyle}>
                  <I.Cal s={13} /> Entrega
                </label>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {[
                    { label: "Hoy", val: fmt.todayISO() },
                    { label: "Mañana", val: fmt.tomorrowISO() },
                    { label: "Pasado", val: fmt.dayAfterISO() },
                  ].map(d => (
                    <button key={d.label} title={`Fecha de entrega: ${d.label.toLowerCase()}`} onClick={() => setFecha(d.val)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 10,
                        border: fecha === d.val ? "2px solid #4F6867" : "1.5px solid #A2C2D0",
                        background: fecha === d.val ? "#E1F2FC" : "#EFE9E4",
                        color: fecha === d.val ? "#1B1C39" : "#4F6867",
                        fontWeight: fecha === d.val ? 700 : 500,
                        fontSize: 13, cursor: "pointer",
                        transition: "all 0.15s",
                      }}>
                      {d.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <div style={{ position: "absolute", left: 10, pointerEvents: "none", zIndex: 1, color: "#4F6867", display: "flex" }}><I.Cal s={14} /></div>
                    <input type="date" lang="es" value={fecha}
                      onChange={e => setFecha(e.target.value)}
                      style={{ ...inputStyle, paddingLeft: 30, border: "2px solid #4F6867", background: "#fff" }} />
                  </div>
                  <input type="time" value={hora}
                    onChange={e => setHora(e.target.value)}
                    placeholder="Hora"
                    style={inputStyle} />
                </div>
              </section>

              {/* ── Submit ── */}
          <button title="Crear nuevo pedido en Notion" onClick={crearPedido}
            disabled={!cliente.trim() || !fecha || lineas.length === 0}
            style={{
              width: "100%", padding: "16px",
              borderRadius: 14, border: "none",
              background: (!cliente.trim() || !fecha || lineas.length === 0)
                ? "#A2C2D0"
                : "linear-gradient(135deg, #4F6867, #1B1C39)",
              color: (!cliente.trim() || !fecha || lineas.length === 0)
                ? "#fff" : "#fff",
              fontSize: 16, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Roboto Condensed', sans-serif",
              boxShadow: (!cliente.trim() || !fecha || lineas.length === 0)
                ? "none" : "0 4px 16px rgba(166,119,38,0.35)",
              transition: "all 0.3s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              letterSpacing: "-0.01em",
            }}>
            <I.Send s={18} />
            {lineas.length > 0
              ? `Crear pedido — ${totalPedido.toFixed(2)}€`
              : "Crear pedido"}
          </button>
              <p style={{
                textAlign: "center", fontSize: 10, color: "#A2C2D0",
                marginTop: 8,
              }}>
                {apiMode === "demo"
                  ? "Modo demo: el pedido se añade localmente"
                  : "Se creará pedido + registros + cliente en Notion"}
              </p>
            </div>
          )}
        </div>
      )}
      {showParseModal && <ParseWhatsAppModal parseText={parseText} setParseText={setParseText} parseImage={parseImage} setParseImage={setParseImage} parseResult={parseResult} setParseResult={setParseResult} parseError={parseError} setParseError={setParseError} parseLoading={parseLoading} parseFileRef={parseFileRef} onClose={() => { stopListening(); setShowParseModal(false); }} onAnalyze={handleParseOrder} onApply={aplicarParseo} onToggleListening={toggleListening} handleParsePaste={handleParsePaste} handleParseDrop={handleParseDrop} handleParseImageFile={handleParseImageFile} />}
      {isListening && <ListeningPopup listenText={listenText} listenError={listenError} onStop={stopListening} />}
    </>
  );
}
