import { getRedisClient } from "../utils/redis";

const TIMELINE_KEY = "a2uiform:timeline";
const SUBMISSION_PREFIX = "a2uiform:submission:";

function parseJsonMaybe(value: string) {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function decodeHashEntry(entry: Record<string, string>) {
  const keys = Object.keys(entry);
  if (keys.length === 0) {
    return null;
  }
  const normalized: Record<string, unknown> = {};
  keys.forEach((key) => {
    normalized[key] = parseJsonMaybe(entry[key]);
  });
  return normalized;
}

export default defineEventHandler(async () => {
  try {
    const redis = await getRedisClient();
    
    // Get latest 100 IDs
    const ids = await redis.lRange(TIMELINE_KEY, 0, 99);
    
    if (ids.length === 0) {
      return { items: [] };
    }

    // MGET needs individual keys
    const keys = ids.map((id) => `${SUBMISSION_PREFIX}${id}`);
    const rawItems = await redis.mGet(keys);

    const items: Array<Record<string, unknown>> = [];
    const missingKeys: string[] = [];

    rawItems.forEach((item, index) => {
      if (!item) {
        missingKeys.push(keys[index]);
        return;
      }
      try {
        const parsed = JSON.parse(item);
        if (parsed) {
          items.push(parsed);
          return;
        }
      } catch {
        // try hash fallback
      }
      missingKeys.push(keys[index]);
    });

    if (missingKeys.length > 0) {
      const pipeline = redis.multi();
      missingKeys.forEach((key) => pipeline.hGetAll(key));
      const hashResults = await pipeline.exec();
      hashResults.forEach((result) => {
        const entry = result as Record<string, string>;
        const decoded = decodeHashEntry(entry);
        if (decoded) {
          items.push(decoded);
        }
      });
    }

    // Flatten logic is preserved if necessary, though new structure is flatter per ID.
    // The previous implementation flattened specific structure. 
    // Since we are writing normalized entries now, we can just return items.
    // However, to maintain exact backward compatibility with frontend expectation of "items" structure:
    // The frontend expected { items: flattened_array }.
    
    return { items };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createError({
      statusCode: 500,
      statusMessage: "Redis read failed",
      data: { message },
    });
  }
});
