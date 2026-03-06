import { loadCatalog } from "./_notion.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, senderName, senderPhone } = req.body;
  if (!text || typeof text !== "string" || text.trim().length < 5) {
    return res.status(400).json({ error: "text is required (min 5 chars)" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    // Load product catalog (cached 5min)
    const catalogo = await loadCatalog();
    const productNames = catalogo.map(p => p.nombre);

    // Build date context
    const now = new Date();
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const dayName = dias[now.getDay()];

    const systemPrompt = `Eres un parser de pedidos para Vynia, una pastelería sin gluten. Dado un mensaje de WhatsApp, extrae la información del pedido.

Catálogo de productos (usa EXACTAMENTE estos nombres cuando haya match):
${productNames.join("\n")}

Fecha de hoy: ${todayISO} (${dayName})

Responde SOLO con JSON válido, sin markdown ni explicaciones:
{
  "cliente": "nombre del cliente si se menciona, o null",
  "telefono": "teléfono si se menciona (solo dígitos), o null",
  "fecha": "YYYY-MM-DD o null si no se puede determinar",
  "hora": "HH:MM o null",
  "pagado": false,
  "notas": "cualquier indicación especial, alergias, dedicatorias, etc. o null",
  "productos": [
    { "nombre": "nombre EXACTO del catálogo", "cantidad": 1 }
  ],
  "no_encontrados": ["productos mencionados que no están en el catálogo"]
}

Reglas:
- Matchea nombres de productos de forma flexible ("brownie" → "Brownie", "cookies chocolate" → "Cookies de chocolate y avellanas", "croissant" → el croissant más probable)
- Si el cliente dice "mañana", "pasado", "el lunes", etc., calcula la fecha real desde hoy ${todayISO} (${dayName})
- Si no se menciona cantidad, asume 1
- Si hay conversación larga con negociación, extrae solo el pedido final/confirmado
- NO inventes productos que no están en el catálogo — ponlos en no_encontrados
- Si se menciona un nombre de persona como remitente o firma, úsalo como cliente`;

    let userMessage = text.trim();
    if (senderName) userMessage += `\n\n[Remitente del mensaje: ${senderName}]`;
    if (senderPhone) userMessage += `\n[Teléfono del remitente: ${senderPhone}]`;

    // Call Anthropic API
    const apiRes = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          { role: "user", content: userMessage },
        ],
        system: systemPrompt,
      }),
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      console.error("Anthropic API error:", apiRes.status, errBody);
      return res.status(502).json({ error: "Error al conectar con IA" });
    }

    const apiData = await apiRes.json();
    const rawContent = apiData.content?.[0]?.text || "";

    // Parse JSON from response (strip markdown fences if present)
    let parsed;
    try {
      const jsonStr = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      return res.status(502).json({ error: "La IA no devolvió un formato válido" });
    }

    // Post-process: validate products against catalog
    const catalogSet = new Map(catalogo.map(p => [p.nombre.toLowerCase(), p.nombre]));
    const lineas = [];
    const warnings = [];

    for (const prod of (parsed.productos || [])) {
      const exactMatch = catalogSet.get(prod.nombre?.toLowerCase());
      if (exactMatch) {
        lineas.push({
          nombre: exactMatch,
          cantidad: Math.max(1, Math.round(prod.cantidad || 1)),
          matched: true,
        });
      } else {
        warnings.push(`No se encontró "${prod.nombre}" en el catálogo`);
      }
    }

    for (const nf of (parsed.no_encontrados || [])) {
      const already = warnings.some(w => w.includes(nf));
      if (!already) warnings.push(`No se encontró "${nf}" en el catálogo`);
    }

    // Calculate confidence
    const totalMentioned = (parsed.productos?.length || 0) + (parsed.no_encontrados?.length || 0);
    const matchedCount = lineas.length;
    let confidence = "high";
    if (totalMentioned === 0) confidence = "low";
    else if (matchedCount === 0) confidence = "low";
    else if (matchedCount < totalMentioned) confidence = "medium";

    return res.status(200).json({
      ok: true,
      confidence,
      cliente: parsed.cliente || senderName || null,
      telefono: parsed.telefono || senderPhone || null,
      fecha: parsed.fecha || null,
      hora: parsed.hora || null,
      pagado: parsed.pagado || false,
      notas: parsed.notas || null,
      lineas,
      warnings,
    });
  } catch (error) {
    console.error("Error in parse-order:", error);
    return res.status(500).json({ error: error.message });
  }
}
