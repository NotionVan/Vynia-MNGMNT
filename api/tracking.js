import { notion, cached, PROP_UNIDADES } from "./_notion.js";

const DB_CLIENTES = "1c418b3a-38b1-811f-b3ab-ea7a5e513ace";
const DB_PEDIDOS = "1c418b3a-38b1-81a1-9f3c-da137557fcf6";
const DB_REGISTROS = "1d418b3a-38b1-808b-9afb-c45193c1270b";

function extractTitle(prop) {
  if (!prop || prop.type !== "title") return "";
  return (prop.title || []).map((t) => t.plain_text).join("");
}

function extractRichText(prop) {
  if (!prop || prop.type !== "rich_text") return "";
  return (prop.rich_text || []).map((t) => t.plain_text).join("");
}

function extractDateStart(prop) {
  if (!prop || prop.type !== "date" || !prop.date) return "";
  return prop.date.start || "";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tel } = req.query;
  if (!tel || tel.replace(/\D/g, "").length < 6) {
    return res.status(400).json({ error: "Introduce un número de teléfono válido" });
  }

  const cleanTel = tel.replace(/\D/g, "");
  const searchTel = cleanTel.startsWith("34") && cleanTel.length > 9
    ? cleanTel.slice(2)
    : cleanTel;

  try {
    // Cache whole response for 15s (repeated lookups by same client)
    const result = await cached(`tracking:${searchTel}`, 15000, async () => {
      // 1. Find client by phone number
      const clientSearch = await notion.databases.query({
        database_id: DB_CLIENTES,
        filter: {
          property: "Teléfono",
          phone_number: { contains: searchTel },
        },
        page_size: 5,
      });

      if (clientSearch.results.length === 0) {
        return { pedidos: [], cliente: null };
      }

      // Prioritize exact phone match when multiple results (e.g. "612" matching several)
      let bestMatch = clientSearch.results[0];
      if (clientSearch.results.length > 1 && searchTel.length >= 9) {
        const exact = clientSearch.results.find(r => {
          const phone = (r.properties["Teléfono"]?.phone_number || "").replace(/\D/g, "");
          return phone === searchTel || phone.endsWith(searchTel);
        });
        if (exact) bestMatch = exact;
      }

      const clienteId = bestMatch.id;
      const titleProp = Object.values(bestMatch.properties).find(p => p.type === "title");
      const clienteNombre = titleProp
        ? (titleProp.title || []).map(t => t.plain_text).join("")
        : "";

      // 2. Query pedidos for this client (recent first)
      const pedidosRes = await notion.databases.query({
        database_id: DB_PEDIDOS,
        filter: {
          property: "Clientes",
          relation: { contains: clienteId },
        },
        sorts: [{ property: "Fecha entrega", direction: "descending" }],
        page_size: 20,
      });

      if (pedidosRes.results.length === 0) {
        return { pedidos: [], cliente: clienteNombre };
      }

      // 3. Build pedido list
      const pedidoIds = [];
      const pedidos = pedidosRes.results.map(page => {
        const p = page.properties;
        const estado = p["Estado"]?.status?.name || null;
        const effectiveEstado = estado
          || (p["Recogido"]?.checkbox ? "Recogido" : null)
          || (p["No acude"]?.checkbox ? "No acude" : null)
          || (p["Incidencia"]?.checkbox ? "Incidencia" : null)
          || "Sin empezar";

        pedidoIds.push(page.id);
        return {
          numPedido: p["Nº Pedido"]?.unique_id?.number || 0,
          fecha: extractDateStart(p["Fecha entrega"]),
          estado: effectiveEstado,
          _id: page.id,
          productos: [],
        };
      });

      // 4. Single OR query for ALL registros across all pedidos
      const orConditions = pedidoIds.map(id => ({
        property: "Pedidos",
        relation: { contains: id },
      }));

      let allRegistros = [];
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

      // Group registros by pedido ID
      for (const reg of allRegistros) {
        const regPedidoIds = (reg.properties["Pedidos"]?.relation || []).map(r => r.id);
        const auxProd = reg.properties["AUX Producto Texto"];
        const nombre = (auxProd?.formula?.string || "").trim()
          || extractTitle(reg.properties["Nombre"]);
        const unidades = reg.properties[PROP_UNIDADES]?.number || 0;
        if (!nombre || unidades <= 0) continue;

        for (const ped of pedidos) {
          if (regPedidoIds.includes(ped._id)) {
            ped.productos.push({ nombre, unidades });
          }
        }
      }

      // Strip internal IDs
      const safePedidos = pedidos.map(({ _id, ...rest }) => rest);
      return { cliente: clienteNombre, pedidos: safePedidos };
    }); // end cached

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error tracking pedidos:", error);
    return res.status(500).json({ error: "Error al consultar pedidos" });
  }
}
