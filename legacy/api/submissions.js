import { kv } from "@vercel/kv";

const SUBMISSIONS_KEY = "a2uiform:submissions";

function getMissingKvVars() {
  const required = ["KV_REST_API_URL", "KV_REST_API_TOKEN"];
  return required.filter((key) => !process.env[key]);
}

export default async function handler(request, response) {
  const missing = getMissingKvVars();
  if (missing.length > 0) {
    response
      .status(500)
      .json({ error: "Vercel KV is not configured", missing });
    return;
  }

  if (request.method === "DELETE") {
    const formName = request.query?.formName;
    if (!formName) {
      response.status(400).json({ error: "formName is required" });
      return;
    }
    try {
      const items = await kv.lrange(SUBMISSIONS_KEY, 0, -1);
      const remaining = items.filter((item) => item.formName !== formName);
      await kv.del(SUBMISSIONS_KEY);
      if (remaining.length > 0) {
        await kv.lpush(SUBMISSIONS_KEY, ...remaining);
      }
      response
        .status(200)
        .json({ ok: true, removed: items.length - remaining.length });
    } catch (error) {
      response
        .status(500)
        .json({ error: "KV delete failed", message: error.message });
    }
    return;
  }

  if (request.method === "GET") {
    try {
      const items = await kv.lrange(SUBMISSIONS_KEY, 0, 99);
      const parsed = items
        .map((item) => {
          if (typeof item === "string") {
            try {
              return JSON.parse(item);
            } catch (error) {
              return null;
            }
          }
          return item;
        })
        .filter(Boolean);

      const flattened = [];
      parsed.forEach((entry) => {
        if (Array.isArray(entry.items)) {
          entry.items.forEach((item) => flattened.push(item));
          return;
        }
        flattened.push(entry);
      });

      response.status(200).json({ items: flattened });
    } catch (error) {
      response
        .status(500)
        .json({ error: "KV read failed", message: error.message });
    }
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const payload = request.body;
  if (!payload || typeof payload !== "object") {
    response.status(400).json({ error: "Invalid payload" });
    return;
  }

  const now = new Date().toISOString();
  const entries = Array.isArray(payload.items)
    ? payload.items.map((item) => ({
        ...item,
        createdAt: item.createdAt || now,
      }))
    : [
        {
          ...payload,
          createdAt: payload.createdAt || now,
        },
      ];

  try {
    const payloads = entries.map((entry) => JSON.stringify(entry));
    await kv.lpush(SUBMISSIONS_KEY, ...payloads);
    response.status(200).json({ ok: true, count: entries.length });
  } catch (error) {
    response
      .status(500)
      .json({ error: "KV write failed", message: error.message });
  }
}
