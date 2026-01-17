import { getRedisClient } from "../utils/redis";

const SUBMISSIONS_KEY = "a2uiform:submissions";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const formName = typeof query.formName === "string" ? query.formName : "";
  if (!formName) {
    throw createError({
      statusCode: 400,
      statusMessage: "formName is required",
    });
  }

  try {
    const redis = await getRedisClient();
    const items = await redis.lRange(SUBMISSIONS_KEY, 0, -1);
    const parsed = items
      .map((item: string) => {
        try {
          return JSON.parse(item);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean) as Array<Record<string, unknown>>;
    const remaining = parsed.filter(
      (item) => item.formName === undefined || item.formName !== formName
    );
    await redis.del(SUBMISSIONS_KEY);
    if (remaining.length > 0) {
      const payloads = remaining.map((entry) => JSON.stringify(entry));
      await redis.lPush(SUBMISSIONS_KEY, payloads);
    }
    return { ok: true, removed: parsed.length - remaining.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createError({
      statusCode: 500,
      statusMessage: "Redis delete failed",
      data: { message },
    });
  }
});
