import { kv } from "@vercel/kv";

const SUBMISSIONS_KEY = "a2uiform:submissions";

function isKvConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export default async function handler(request, response) {
  if (!isKvConfigured()) {
    response.status(500).json({ error: "Vercel KV is not configured" });
    return;
  }

  if (request.method === "GET") {
    try {
      const items = await kv.lrange(SUBMISSIONS_KEY, 0, 99);
      response.status(200).json({ items });
    } catch (error) {
      response.status(500).json({ error: "KV read failed" });
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

  const entry = {
    ...payload,
    createdAt: payload.createdAt || new Date().toISOString(),
  };

  try {
    await kv.lpush(SUBMISSIONS_KEY, entry);
    response.status(200).json({ ok: true, entry });
  } catch (error) {
    response.status(500).json({ error: "KV write failed" });
  }
}
