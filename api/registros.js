import { notion, delay, cached, PROP_UNIDADES } from "./_notion.js";

const DB_PRODUCTOS = "1c418b3a-38b1-8186-8da9-cfa6c2f0fcd2";
const DB_REGISTROS = "1d418b3a-38b1-808b-9afb-c45193c1270b";

export default async function handler(req, res) {
  if (req.method === "GET") {
    if (req.query.productos === "true") return handleGetProductos(req, res);
    if (req.query.orphans === "true") return handleGetOrphans(req, res);
    return handleGet(req, res);
  }
  if (req.method === "DELETE") {
    return handleDelete(req, res);
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pedidoPageId, productoNombre, cantidad } = req.body;

  if (!pedidoPageId || !productoNombre || !cantidad) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (typeof cantidad !== "number" || cantidad <= 0 || !Number.isInteger(cantidad)) {
    return res.status(400).json({ error: "cantidad must be a positive integer" });
  }

  try {
    // Search for product by name
    const productSearch = await notion.databases.query({
      database_id: DB_PRODUCTOS,
      filter: {
        property: "title",
        title: { equals: productoNombre },
      },
    });

    if (productSearch.results.length === 0) {
      return res.status(400).json({ error: `Producto no encontrado: ${productoNombre}` });
    }
    const productoPageId = productSearch.results[0].id;

    // Create line item in Registros
    // PROP_UNIDADES = "Unidades " (trailing space — defined in _notion.js)
    const properties = {
      title: {
        title: [{ text: { content: productoNombre } }],
      },
      [PROP_UNIDADES]: {
        number: cantidad,
      },
      Pedidos: {
        relation: [{ id: pedidoPageId }],
      },
    };

    properties["Productos"] = {
      relation: [{ id: productoPageId }],
    };

    await notion.pages.create({
      parent: { database_id: DB_REGISTROS },
      properties,
    });

    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error("Error creating registro:", error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleDelete(req, res) {
  const { registroIds } = req.body;
  if (!Array.isArray(registroIds) || registroIds.length === 0) {
    return res.status(400).json({ error: "Missing registroIds array" });
  }

  try {
    for (let i = 0; i < registroIds.length; i += 3) {
      await Promise.all(registroIds.slice(i, i + 3).map(id =>
        notion.pages.update({ page_id: id, archived: true })
      ));
      if (i + 3 < registroIds.length) await delay(200);
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error deleting registros:", error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req, res) {
  const { pedidoId } = req.query;
  if (!pedidoId) {
    return res.status(400).json({ error: "Missing pedidoId" });
  }

  try {
    let allResults = [];
    let cursor = undefined;
    do {
      const response = await notion.databases.query({
        database_id: DB_REGISTROS,
        filter: { property: "Pedidos", relation: { contains: pedidoId } },
        start_cursor: cursor,
        page_size: 100,
      });
      allResults = allResults.concat(response.results);
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const productos = allResults.map(reg => {
      const auxProd = reg.properties["AUX Producto Texto"];
      const nombre = (auxProd?.formula?.string || "").trim()
        || (reg.properties["Nombre"]?.title || []).map(t => t.plain_text).join("").trim();
      const unidades = reg.properties[PROP_UNIDADES]?.number || 0;
      return { id: reg.id, nombre, unidades };
    }).filter(p => p.nombre && p.unidades > 0);

    return res.status(200).json(productos);
  } catch (error) {
    console.error("Error loading registros:", error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGetOrphans(req, res) {
  try {
    const orphanIds = [];
    let cursor;
    do {
      const resp = await notion.databases.query({
        database_id: DB_REGISTROS,
        filter: { property: "Pedidos", relation: { is_empty: true } },
        start_cursor: cursor,
        page_size: 100,
      });
      for (const page of resp.results) orphanIds.push(page.id);
      cursor = resp.has_more ? resp.next_cursor : undefined;
    } while (cursor);
    return res.status(200).json({ orphanIds, count: orphanIds.length });
  } catch (error) {
    console.error("Error finding orphan registros:", error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGetProductos(_req, res) {
  try {
    const productos = await cached("productos", 300000, async () => {
      const result = [];
      let cursor;
      do {
        const resp = await notion.databases.query({
          database_id: DB_PRODUCTOS,
          start_cursor: cursor,
          page_size: 100,
        });
        for (const page of resp.results) {
          const p = page.properties;
          const nombre = p["Nombre"]?.title?.[0]?.plain_text?.trim();
          const precio = p["Precio"]?.number;
          const cat = p["Categoría"]?.select?.name || "";
          if (nombre && precio != null) {
            result.push({ nombre, precio, cat });
          }
        }
        cursor = resp.has_more ? resp.next_cursor : undefined;
      } while (cursor);
      result.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      return result;
    });
    res.status(200).json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
