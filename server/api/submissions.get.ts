import { getRedisClient } from "../utils/redis";

const SUBMISSIONS_KEY = "a2uiform:submissions";

export default defineEventHandler(async () => {
  try {
    const redis = await getRedisClient();
    const items = await redis.lRange(SUBMISSIONS_KEY, 0, 99);
    const parsed = items
      .map((item: string) => {
        try {
          return JSON.parse(item);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    const flattened: Array<Record<string, unknown>> = [];
    parsed.forEach((entry) => {
      if (Array.isArray(entry.items)) {
        entry.items.forEach((item: Record<string, unknown>) =>
          flattened.push(item)
        );
        return;
      }
      flattened.push(entry);
    });

    return { items: flattened };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createError({
      statusCode: 500,
      statusMessage: "Redis read failed",
      data: { message },
    });
  }
});
