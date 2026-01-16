import { kv } from "@vercel/kv";

const SUBMISSIONS_KEY = "a2uiform:submissions";

export default async function handler(request, response) {
  if (request.method === "GET") {
    const items = await kv.lrange(SUBMISSIONS_KEY, 0, 99);
    response.status(200).json({ items });
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

  await kv.lpush(SUBMISSIONS_KEY, entry);
  response.status(200).json({ ok: true, entry });
}
