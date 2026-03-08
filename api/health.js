import { notion, cached } from "./_notion.js";

const DB_PEDIDOS = "1c418b3a-38b1-81a1-9f3c-da137557fcf6";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await cached("health", 30000, async () => {
      const start = Date.now();
      await notion.databases.retrieve({ database_id: DB_PEDIDOS });
      return { latency: Date.now() - start };
    });

    return res.status(200).json({
      ok: true,
      latency: result.latency,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      error: error.message || "Notion unreachable",
      ts: new Date().toISOString(),
    });
  }
}
