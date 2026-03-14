import { notion, deleteCachedPrefix } from "../_notion.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const { properties, archived } = req.body;

  if (!id || (!properties && archived === undefined)) {
    return res.status(400).json({ error: "Missing id or properties" });
  }

  try {
    const update = { page_id: id };
    if (properties) update.properties = properties;
    if (archived !== undefined) update.archived = archived;
    await notion.pages.update(update);
    deleteCachedPrefix("pedidos:");

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error updating page:", error);
    return res.status(500).json({ error: error.message });
  }
}
