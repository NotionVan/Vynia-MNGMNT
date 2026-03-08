import { useState, useEffect } from "react";
import { notion } from "../api.js";
import { CATALOGO_FALLBACK, rebuildPriceMap } from "../constants/catalogo.js";

export default function useCatalog(apiMode) {
  const [catalogo, setCatalogo] = useState(CATALOGO_FALLBACK);

  useEffect(() => {
    if (apiMode === "demo") { setCatalogo(CATALOGO_FALLBACK); return; }
    // Immediate: use localStorage cache if fresh enough (<2h)
    try {
      const raw = localStorage.getItem("vynia-catalogo");
      if (raw) {
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts < 7200000 && Array.isArray(data) && data.length > 0) {
          setCatalogo(data);
          rebuildPriceMap(data);
        }
      }
    } catch { /* ignore corrupt cache */ }
    // Background: fetch fresh catalog and update localStorage
    notion.loadProductos()
      .then(prods => {
        if (Array.isArray(prods) && prods.length > 0) {
          setCatalogo(prods);
          rebuildPriceMap(prods);
          try { localStorage.setItem("vynia-catalogo", JSON.stringify({ ts: Date.now(), data: prods })); } catch {}
        }
      })
      .catch(() => { /* fallback silently */ });
  }, [apiMode]);

  return catalogo;
}
