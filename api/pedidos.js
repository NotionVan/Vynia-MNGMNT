import { notion, cached, withTiming, PROP_UNIDADES, DB_REGISTROS, loadCatalog, extractTitle, extractRichText, extractDateStart } from "./_notion.js";

const DB_PEDIDOS = "1c418b3a-38b1-81a1-9f3c-da137557fcf6";
// Data source ID for API 2025-09-03 (required for template support)
const DS_PEDIDOS = "1c418b3a-38b1-8176-a42b-000b33f3b1aa";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}

function nextDay(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

async function handleGet(req, res) {
  try {
    const { data: pedidos, ms } = await withTiming("total", async () => {
    const filter = req.query.filter || "todos";
    const fecha = req.query.fecha; // YYYY-MM-DD — filter by delivery date
    const clienteId = req.query.clienteId; // filter by client relation
    const cacheKey = `pedidos:${filter}:${fecha || ""}:${clienteId || ""}`;

    return cached(cacheKey, 10000, async () => {
      const conditions = [];

      // Client filter: pedidos for a specific client
      if (clienteId) {
        conditions.push({ property: "Clientes", relation: { contains: clienteId } });
      }

      // Date filter: if fecha is provided, filter to that specific day
      if (fecha) {
        conditions.push({ property: "Fecha entrega", date: { on_or_after: fecha } });
        conditions.push({ property: "Fecha entrega", date: { before: nextDay(fecha) } });
      }

      // Status filter
      if (filter === "pendientes") {
        conditions.push({ property: "Recogido", checkbox: { equals: false } });
        conditions.push({ property: "No acude", checkbox: { equals: false } });
        conditions.push({ property: "Incidencia", checkbox: { equals: false } });
      } else if (filter === "recogidos") {
        conditions.push({ property: "Recogido", checkbox: { equals: true } });
      }

      let notionFilter = undefined;
      if (conditions.length === 1) {
        notionFilter = conditions[0];
      } else if (conditions.length > 1) {
        notionFilter = { and: conditions };
      }

      const sorts = [{ property: "Fecha entrega", direction: "ascending" }];

      let allResults = [];
      let cursor = undefined;
      do {
        const response = await notion.databases.query({
          database_id: DB_PEDIDOS,
          ...(notionFilter && { filter: notionFilter }),
          sorts,
          start_cursor: cursor,
          page_size: 100,
        });
        allResults = allResults.concat(response.results);
        cursor = response.has_more ? response.next_cursor : undefined;
      } while (cursor);

      // Build pedido list (client name from rollup — no extra API calls)
      const pedidoList = allResults.map((page) => {
        const p = page.properties;
        const clientRelation = p["Clientes"]?.relation || [];
        const clientId = clientRelation.length > 0 ? clientRelation[0].id : null;
        const telRollup = p["Teléfono"]?.rollup?.array || [];
        const telefono = telRollup.length > 0 ? (telRollup[0].phone_number || "") : "";
        const clienteRollup = p["AUX Nombre Cliente"]?.rollup?.array || [];
        const cliente = clienteRollup.length > 0
          ? (clienteRollup[0].title || []).map(t => t.plain_text).join("")
          : "";
        return {
          id: page.id,
          titulo: extractTitle(p["Pedido"]),
          fecha: extractDateStart(p["Fecha entrega"]),
          recogido: p["Recogido"]?.checkbox || false,
          noAcude: p["No acude"]?.checkbox || false,
          pagado: p["Pagado al reservar"]?.checkbox || false,
          incidencia: p["Incidencia"]?.checkbox || false,
          estado: p["Estado"]?.status?.name || null,
          notas: extractRichText(p["Notas"]),
          numPedido: p["Nº Pedido"]?.unique_id?.number || 0,
          clienteId: clientId,
          telefono,
          cliente,
        };
      });

      // ── Bulk fetch registros + importe (same pattern as produccion.js) ──
      if (pedidoList.length === 0) return pedidoList;

      const pedidoIds = pedidoList.map(p => p.id);
      const OR_BATCH = 100;
      let allRegistros = [];

      for (let i = 0; i < pedidoIds.length; i += OR_BATCH) {
        const chunk = pedidoIds.slice(i, i + OR_BATCH);
        const orCond = chunk.map(id => ({
          property: "Pedidos",
          relation: { contains: id },
        }));
        let cursor;
        do {
          const regRes = await notion.databases.query({
            database_id: DB_REGISTROS,
            filter: orCond.length === 1 ? orCond[0] : { or: orCond },
            start_cursor: cursor,
            page_size: 100,
          });
          allRegistros = allRegistros.concat(regRes.results);
          cursor = regRes.has_more ? regRes.next_cursor : undefined;
        } while (cursor);
      }

      // Build price map from catalog (cached 30min)
      const catalog = await loadCatalog();
      const priceMap = {};
      for (const c of catalog) {
        priceMap[c.nombre.toLowerCase().trim()] = c.precio;
      }

      // Group registros by pedido
      const pedidoProducts = {};
      for (const reg of allRegistros) {
        const regPedidoIds = (reg.properties["Pedidos"]?.relation || []).map(r => r.id);
        const auxProd = reg.properties["AUX Producto Texto"];
        const nombre = (auxProd?.formula?.string || "").trim()
          || extractTitle(reg.properties["Nombre"]);
        const unidades = reg.properties[PROP_UNIDADES]?.number || 0;
        if (!nombre || unidades === 0) continue;
        for (const pid of regPedidoIds) {
          if (!pedidoProducts[pid]) pedidoProducts[pid] = [];
          pedidoProducts[pid].push({ nombre, unidades });
        }
      }

      // Attach productos string + importe to each pedido
      for (const ped of pedidoList) {
        const prods = pedidoProducts[ped.id] || [];
        ped.productos = prods.map(p => `${p.unidades}x ${p.nombre}`).join(", ");
        ped.importe = prods.reduce(
          (s, p) => s + p.unidades * (priceMap[p.nombre.toLowerCase().trim()] || 0),
          0,
        );
      }

      return pedidoList;
    });
    }); // withTiming

    res.setHeader("Server-Timing", `total;dur=${ms}`);
    return res.status(200).json(pedidos);
  } catch (error) {
    console.error("Error querying pedidos:", error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePost(req, res) {
  try {
    const { properties } = req.body;
    if (!properties) {
      return res.status(400).json({ error: "Missing properties" });
    }

    // Raw fetch with Notion-Version 2025-09-03 to support template parameter
    // (SDK v2 doesn't support it — only used here, rest of app stays on SDK v2)
    const resp = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2025-09-03",
      },
      body: JSON.stringify({
        parent: { type: "data_source_id", data_source_id: DS_PEDIDOS },
        properties,
        template: { type: "default" },
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || `Notion API error ${resp.status}`);
    }
    const page = await resp.json();

    return res.status(201).json({ id: page.id });
  } catch (error) {
    console.error("Error creating pedido:", error);
    return res.status(500).json({ error: error.message });
  }
}
