import { getRedisClient } from "../utils/redis";

const SUBMISSIONS_KEY = "a2uiform:submissions";

type SubmissionPayload = {
  items?: Array<Record<string, unknown>>;
  createdAt?: string;
} & Record<string, unknown>;

export default defineEventHandler(async (event) => {
  const payload = (await readBody(event)) as SubmissionPayload;
  if (!payload || typeof payload !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid payload",
    });
  }

  const now = new Date().toISOString();
  const entries = Array.isArray(payload.items)
    ? payload.items.map((item: Record<string, unknown>) => ({
        ...item,
        createdAt: item.createdAt || now,
      }))
    : [
        {
          ...payload,
          createdAt: payload.createdAt || now,
        } as Record<string, unknown>,
      ];

  try {
    const payloads = entries.map((entry: Record<string, unknown>) =>
      JSON.stringify(entry)
    );
    const redis = await getRedisClient();
    if (payloads.length > 0) {
      await redis.lPush(SUBMISSIONS_KEY, payloads);
    }
    return { ok: true, count: entries.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createError({
      statusCode: 500,
      statusMessage: "Redis write failed",
      data: { message },
    });
  }
});
