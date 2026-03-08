import { notion, cached, clearCached, withTiming, PROP_UNIDADES, DB_REGISTROS, DB_PLANIFICACION, extractTitle, extractRichText, extractDateStart } from "./_notion.js";

const DB_PEDIDOS = "1c418b3a-38b1-81a1-9f3c-da137557fcf6";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { fecha, rango, surplus } = req.query;
    if (!fecha) return res.status(400).json({ error: "Missing fecha parameter" });
    if (surplus === "true") return handleGetSurplus(req, res, fecha);
    if (rango) return handleRango(req, res, fecha, parseInt(rango, 10));
    // Fall through to main produccion GET below
  } else if (req.method === "POST") {
    return handlePostSurplus(req, res);
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fecha } = req.query;

  try {
    const { data: productos, ms } = await withTiming("total", () =>
    cached(`produccion:${fecha}`, 60000, async () => {
    // 1. Get pedidos for the given date (paginated — handles >100 pedidos)
    let pedidos = [];
    let pedidosCursor = undefined;
    do {
      const pedidosRes = await notion.databases.query({
        database_id: DB_PEDIDOS,
        filter: {
          and: [
            { property: "Fecha entrega", date: { on_or_after: fecha } },
            { property: "Fecha entrega", date: { before: nextDay(fecha) } },
            { property: "No acude", checkbox: { equals: false } },
          ],
        },
        start_cursor: pedidosCursor,
        page_size: 100,
      });
      pedidos = pedidos.concat(pedidosRes.results);
      pedidosCursor = pedidosRes.has_more ? pedidosRes.next_cursor : undefined;
    } while (pedidosCursor);
    if (pedidos.length === 0) {
      return [];
    }

    // Build pedido info map (client name from rollup — no extra API calls)
    const pedidoMap = {};

    for (const page of pedidos) {
      const p = page.properties;
      const clientRelation = p["Clientes"]?.relation || [];
      const clientId = clientRelation.length > 0 ? clientRelation[0].id : null;
      const telRollup = p["Teléfono"]?.rollup?.array || [];
      const telefono = telRollup.length > 0 ? (telRollup[0].phone_number || "") : "";
      const clienteRollup = p["AUX Nombre Cliente"]?.rollup?.array || [];
      const cliente = clienteRollup.length > 0
        ? (clienteRollup[0].title || []).map(t => t.plain_text).join("")
        : "";

      pedidoMap[page.id] = {
        pedidoId: page.id,
        pedidoTitulo: extractTitle(p["Pedido"]),
        fecha: extractDateStart(p["Fecha entrega"]),
        recogido: p["Recogido"]?.checkbox || false,
        noAcude: p["No acude"]?.checkbox || false,
        pagado: p["Pagado al reservar"]?.checkbox || false,
        incidencia: p["Incidencia"]?.checkbox || false,
        estado: p["Estado"]?.status?.name || null,
        notas: extractRichText(p["Notas"]),
        numPedido: p["Nº Pedido"]?.unique_id?.number || 0,
        clienteId: clientId,
        cliente,
        telefono,
      };
    }

    // 2. Single OR query for ALL registros (same pattern as tracking.js)
    const pedidoIds = Object.keys(pedidoMap);
    const OR_BATCH = 100; // Notion compound filter limit
    let allRegistros = [];

    for (let i = 0; i < pedidoIds.length; i += OR_BATCH) {
      const chunk = pedidoIds.slice(i, i + OR_BATCH);
      const orConditions = chunk.map(id => ({
        property: "Pedidos",
        relation: { contains: id },
      }));

      let cursor;
      do {
        const regRes = await notion.databases.query({
          database_id: DB_REGISTROS,
          filter: orConditions.length === 1 ? orConditions[0] : { or: orConditions },
          start_cursor: cursor,
          page_size: 100,
        });
        allRegistros = allRegistros.concat(regRes.results);
        cursor = regRes.has_more ? regRes.next_cursor : undefined;
      } while (cursor);
    }

    // 3. Build aggregation from bulk registros
    const productosAgg = {};
    const pedidoProductos = {};
    for (const pid of pedidoIds) pedidoProductos[pid] = [];

    for (const reg of allRegistros) {
      const regPedidoIds = (reg.properties["Pedidos"]?.relation || []).map(r => r.id);
      const auxProd = reg.properties["AUX Producto Texto"];
      const nombre = (auxProd?.formula?.string || "").trim()
        || extractTitle(reg.properties["Nombre"]);
      const unidades = reg.properties[PROP_UNIDADES]?.number || 0;
      if (!nombre || unidades === 0) continue;

      for (const pid of regPedidoIds) {
        if (!pedidoMap[pid]) continue;
        pedidoProductos[pid].push({ nombre, unidades });

        if (!productosAgg[nombre]) {
          productosAgg[nombre] = { nombre, totalUnidades: 0, pedidos: [] };
        }
        productosAgg[nombre].totalUnidades += unidades;
        productosAgg[nombre].pedidos.push({
          ...pedidoMap[pid],
          unidades,
        });
      }
    }

    // Attach full product list to each pedido entry in productosAgg
    for (const prod of Object.values(productosAgg)) {
      for (const ped of prod.pedidos) {
        ped.productos = pedidoProductos[ped.pedidoId] || [];
      }
    }

    // Sort by name
    return Object.values(productosAgg).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );
    }) // end cached
    ); // withTiming

    res.setHeader("Server-Timing", `total;dur=${ms}`);
    return res.status(200).json({ productos });
  } catch (error) {
    console.error("Error loading produccion:", error);
    return res.status(500).json({ error: error.message });
  }
}

function nextDay(dateStr) {
  return addDays(dateStr, 1);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

async function handleRango(req, res, fecha, dias) {
  dias = Math.max(1, Math.min(dias, 14));
  const endDate = addDays(fecha, dias);

  try {
    const result = await cached(`produccion-rango:${fecha}:${dias}`, 60000, async () => {
      // 1. Fetch all pedidos in the date range
      let pedidos = [];
      let cursor;
      do {
        const r = await notion.databases.query({
          database_id: DB_PEDIDOS,
          filter: {
            and: [
              { property: "Fecha entrega", date: { on_or_after: fecha } },
              { property: "Fecha entrega", date: { before: endDate } },
              { property: "No acude", checkbox: { equals: false } },
            ],
          },
          start_cursor: cursor,
          page_size: 100,
        });
        pedidos = pedidos.concat(r.results);
        cursor = r.has_more ? r.next_cursor : undefined;
      } while (cursor);

      if (pedidos.length === 0) return {};

      // 2. Map pedido ID → delivery date (YYYY-MM-DD)
      const pedidoDateMap = {};
      for (const page of pedidos) {
        const ds = extractDateStart(page.properties["Fecha entrega"]);
        pedidoDateMap[page.id] = ds ? ds.split("T")[0] : "";
      }

      // 3. Bulk fetch registros (OR in chunks of 100)
      const pedidoIds = Object.keys(pedidoDateMap);
      const OR_BATCH = 100;
      let allRegistros = [];

      for (let i = 0; i < pedidoIds.length; i += OR_BATCH) {
        const chunk = pedidoIds.slice(i, i + OR_BATCH);
        const orCond = chunk.map(id => ({
          property: "Pedidos",
          relation: { contains: id },
        }));
        let regCursor;
        do {
          const rr = await notion.databases.query({
            database_id: DB_REGISTROS,
            filter: orCond.length === 1 ? orCond[0] : { or: orCond },
            start_cursor: regCursor,
            page_size: 100,
          });
          allRegistros = allRegistros.concat(rr.results);
          regCursor = rr.has_more ? rr.next_cursor : undefined;
        } while (regCursor);
      }

      // 4. Aggregate: date → product → totalUnidades
      const byDate = {};
      for (const reg of allRegistros) {
        const regPedidoIds = (reg.properties["Pedidos"]?.relation || []).map(r => r.id);
        const auxProd = reg.properties["AUX Producto Texto"];
        const nombre = (auxProd?.formula?.string || "").trim()
          || extractTitle(reg.properties["Nombre"]);
        const unidades = reg.properties[PROP_UNIDADES]?.number || 0;
        if (!nombre || unidades === 0) continue;

        for (const pid of regPedidoIds) {
          const d = pedidoDateMap[pid];
          if (!d) continue;
          if (!byDate[d]) byDate[d] = {};
          if (!byDate[d][nombre]) byDate[d][nombre] = 0;
          byDate[d][nombre] += unidades;
        }
      }

      // 5. Convert to response format: { date: [{ nombre, totalUnidades }] }
      const produccion = {};
      for (const [date, prods] of Object.entries(byDate)) {
        produccion[date] = Object.entries(prods)
          .map(([nombre, totalUnidades]) => ({ nombre, totalUnidades }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      }
      return produccion;
    });

    return res.status(200).json({ produccion: result });
  } catch (error) {
    console.error("Error loading produccion rango:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ─── Surplus: planificacion de produccion persistida en Notion ───

async function handleGetSurplus(req, res, fecha) {
  try {
    const plan = await cached(`surplus:${fecha}`, 15000, async () => {
      const results = [];
      let cursor;
      do {
        const resp = await notion.databases.query({
          database_id: DB_PLANIFICACION,
          filter: { property: "Fecha", date: { equals: fecha } },
          start_cursor: cursor,
          page_size: 100,
        });
        results.push(...resp.results);
        cursor = resp.has_more ? resp.next_cursor : undefined;
      } while (cursor);

      const plan = {};
      for (const page of results) {
        const nombre = extractTitle(page.properties["Nombre"]).trim();
        const unidades = page.properties["Unidades"]?.number || 0;
        if (nombre && unidades > 0) plan[nombre] = unidades;
      }
      return plan;
    });

    return res.status(200).json({ plan });
  } catch (error) {
    console.error("Error loading surplus:", error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePostSurplus(req, res) {
  const { surplus, fecha, plan } = req.body;
  if (!surplus || !fecha || !plan || typeof plan !== "object") {
    return res.status(400).json({ error: "Missing surplus, fecha, or plan" });
  }

  try {
    // 1. Load existing entries for this date
    const existing = [];
    let cursor;
    do {
      const resp = await notion.databases.query({
        database_id: DB_PLANIFICACION,
        filter: { property: "Fecha", date: { equals: fecha } },
        start_cursor: cursor,
        page_size: 100,
      });
      existing.push(...resp.results);
      cursor = resp.has_more ? resp.next_cursor : undefined;
    } while (cursor);

    // Build map: nombre → { pageId, unidades }
    const existingMap = new Map();
    for (const page of existing) {
      const nombre = extractTitle(page.properties["Nombre"]).trim();
      existingMap.set(nombre, {
        pageId: page.id,
        unidades: page.properties["Unidades"]?.number || 0,
      });
    }

    // 2. Determine operations
    const toUpdate = [];
    const toCreate = [];
    const toArchive = [];

    for (const [rawName, unidades] of Object.entries(plan)) {
      const nombre = rawName.trim();
      if (unidades <= 0) continue;
      const ex = existingMap.get(nombre);
      if (ex) {
        if (ex.unidades !== unidades) toUpdate.push({ pageId: ex.pageId, unidades });
        existingMap.delete(nombre);
      } else {
        toCreate.push({ nombre, unidades });
      }
    }
    for (const [, { pageId }] of existingMap) toArchive.push(pageId);

    // 3. Execute in parallel batches of 10
    const ops = [];

    for (let i = 0; i < toUpdate.length; i += 10) {
      ops.push(Promise.allSettled(toUpdate.slice(i, i + 10).map(item =>
        notion.pages.update({ page_id: item.pageId, properties: { Unidades: { number: item.unidades } } })
      )));
    }
    for (let i = 0; i < toCreate.length; i += 10) {
      ops.push(Promise.allSettled(toCreate.slice(i, i + 10).map(item =>
        notion.pages.create({
          parent: { database_id: DB_PLANIFICACION },
          properties: {
            Nombre: { title: [{ text: { content: item.nombre } }] },
            Fecha: { date: { start: fecha } },
            Unidades: { number: item.unidades },
          },
        })
      )));
    }
    for (let i = 0; i < toArchive.length; i += 10) {
      ops.push(Promise.allSettled(toArchive.slice(i, i + 10).map(id =>
        notion.pages.update({ page_id: id, archived: true })
      )));
    }

    await Promise.all(ops);
    clearCached(`surplus:${fecha}`);

    return res.status(200).json({
      ok: true,
      updated: toUpdate.length,
      created: toCreate.length,
      archived: toArchive.length,
    });
  } catch (error) {
    console.error("Error saving surplus:", error);
    return res.status(500).json({ error: error.message });
  }
}
