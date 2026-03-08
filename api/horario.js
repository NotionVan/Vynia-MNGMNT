import { notion, cached, clearCached, DB_HORARIO, extractTitle, extractRichText } from "./_notion.js";

export default async function handler(req, res) {
  if (req.method === "GET") return handleGet(req, res);
  if (req.method === "PATCH") return handlePatch(req, res);
  return res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(req, res) {
  try {
    const data = await cached("horario", 300000, async () => {
      const results = [];
      let cursor;
      do {
        const resp = await notion.databases.query({
          database_id: DB_HORARIO,
          start_cursor: cursor,
          page_size: 100,
        });
        results.push(...resp.results);
        cursor = resp.has_more ? resp.next_cursor : undefined;
      } while (cursor);

      const horario = {};
      let lastEdited = "";

      for (const page of results) {
        const p = page.properties;
        const dia = p["Día"]?.number;
        if (dia == null || dia < 0 || dia > 6) continue;

        horario[dia] = {
          abierto: p["Abierto"]?.checkbox || false,
          apertura: extractRichText(p["Hora apertura"]),
          cierre: extractRichText(p["Hora cierre"]),
          apertura2: extractRichText(p["Hora apertura 2"]) || null,
          cierre2: extractRichText(p["Hora cierre 2"]) || null,
          pageId: page.id,
        };

        const edited = page.last_edited_time || "";
        if (edited > lastEdited) lastEdited = edited;
      }

      return { horario, lastEdited };
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error loading horario:", error);
    return res.status(500).json({ error: error.message });
  }
}

async function handlePatch(req, res) {
  const { dia, abierto, apertura, cierre, apertura2, cierre2 } = req.body;
  if (dia == null || dia < 0 || dia > 6) {
    return res.status(400).json({ error: "Missing or invalid dia (0-6)" });
  }

  try {
    // Find the page for this day
    const current = await cached("horario", 300000, async () => {
      const results = [];
      let cursor;
      do {
        const resp = await notion.databases.query({
          database_id: DB_HORARIO,
          start_cursor: cursor,
          page_size: 100,
        });
        results.push(...resp.results);
        cursor = resp.has_more ? resp.next_cursor : undefined;
      } while (cursor);

      const horario = {};
      let lastEdited = "";
      for (const page of results) {
        const p = page.properties;
        const d = p["Día"]?.number;
        if (d == null) continue;
        horario[d] = {
          abierto: p["Abierto"]?.checkbox || false,
          apertura: extractRichText(p["Hora apertura"]),
          cierre: extractRichText(p["Hora cierre"]),
          apertura2: extractRichText(p["Hora apertura 2"]) || null,
          cierre2: extractRichText(p["Hora cierre 2"]) || null,
          pageId: page.id,
        };
        const edited = page.last_edited_time || "";
        if (edited > lastEdited) lastEdited = edited;
      }
      return { horario, lastEdited };
    });

    const entry = current.horario[dia];
    if (!entry || !entry.pageId) {
      return res.status(404).json({ error: `No page found for dia ${dia}` });
    }

    // Build properties to update (only changed fields)
    const properties = {};
    if (abierto !== undefined) {
      properties["Abierto"] = { checkbox: abierto };
    }
    if (apertura !== undefined) {
      properties["Hora apertura"] = { rich_text: [{ text: { content: apertura } }] };
    }
    if (cierre !== undefined) {
      properties["Hora cierre"] = { rich_text: [{ text: { content: cierre } }] };
    }
    if (apertura2 !== undefined) {
      properties["Hora apertura 2"] = { rich_text: [{ text: { content: apertura2 || "" } }] };
    }
    if (cierre2 !== undefined) {
      properties["Hora cierre 2"] = { rich_text: [{ text: { content: cierre2 || "" } }] };
    }

    await notion.pages.update({ page_id: entry.pageId, properties });
    clearCached("horario");

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error updating horario:", error);
    return res.status(500).json({ error: error.message });
  }
}
