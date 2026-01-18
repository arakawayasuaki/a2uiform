import { getRedisClient } from "../utils/redis";
import { randomUUID } from "node:crypto";

const TIMELINE_KEY = "a2uiform:timeline";
const SUBMISSION_PREFIX = "a2uiform:submission:";
const FORM_INDEX_PREFIX = "a2uiform:index:form:";

type SubmissionPayload = {
  items?: Array<Record<string, unknown>>;
  createdAt?: string;
  formName?: string;
} & Record<string, unknown>;

function parseKeyValueString(value: string) {
  const parts = value
    .split(/[;\t]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts
    .map((part) => {
      const index = part.indexOf(":");
      if (index === -1) {
        return null;
      }
      const key = part.slice(0, index).trim();
      const rawValue = part.slice(index + 1).trim();
      return key ? { key, value: rawValue } : null;
    })
    .filter(Boolean) as Array<{ key: string; value: string }>;
}

function parseKeyValueRows(value: string) {
  const rowStrings = value
    .split(/\r?\n|\t+/)
    .map((row) => row.trim())
    .filter(Boolean);
  return rowStrings
    .map((row) => {
      const entries = parseKeyValueString(row);
      if (entries.length === 0) {
        return null;
      }
      const obj: Record<string, unknown> = {};
      entries.forEach(({ key, value: entryValue }) => {
        if (key) {
          obj[key] = entryValue;
        }
      });
      return Object.keys(obj).length ? obj : null;
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
}

function normalizeDataRows(data: unknown) {
  if (Array.isArray(data)) {
    return data.flatMap((entry) => normalizeDataRows(entry));
  }
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) || (parsed && typeof parsed === "object")) {
        return normalizeDataRows(parsed);
      }
    } catch {
      // fall through to key-value parsing
    }
    const rows = parseKeyValueRows(trimmed);
    return rows.length ? rows : [];
  }
  if (data && typeof data === "object") {
    return [data as Record<string, unknown>];
  }
  return [];
}

export default defineEventHandler(async (event) => {
  const payload = (await readBody(event)) as SubmissionPayload;
  if (!payload || typeof payload !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid payload",
    });
  }

  const now = new Date().toISOString();
  // Normalize to array with backward compatibility
  let entries: Array<Record<string, unknown>> = [];
  if (Array.isArray(payload.items)) {
    payload.items.forEach((item: Record<string, unknown>) => {
      const createdAt = item.createdAt || now;
      const formName =
        typeof item.formName === "string" ? item.formName : payload.formName || "";
      if ("data" in item) {
        const normalized = normalizeDataRows(item.data);
        if (normalized.length > 0) {
          normalized.forEach((data) => {
            entries.push({ ...item, data, createdAt, formName });
          });
          return;
        }
      }
      entries.push({ ...item, createdAt, formName });
    });
  } else if ("data" in payload) {
    const normalized = normalizeDataRows(payload.data);
    if (normalized.length > 0) {
      entries = normalized.map((data) => ({
        data,
        createdAt: payload.createdAt || now,
        formName: payload.formName || "",
      }));
    } else if (payload.data && typeof payload.data === "object") {
      entries = [
        {
          data: payload.data,
          createdAt: payload.createdAt || now,
          formName: payload.formName || "",
        },
      ];
    }
  }
  if (entries.length === 0) {
    entries = [
      {
        ...payload,
        createdAt: payload.createdAt || now,
      } as Record<string, unknown>,
    ];
  }

  try {
    const redis = await getRedisClient();
    const pipeline = redis.multi();

    for (const entry of entries) {
      const id = randomUUID();
      const formName = typeof entry.formName === "string" ? entry.formName : "";
      
      // Store the actual data
      pipeline.set(`${SUBMISSION_PREFIX}${id}`, JSON.stringify(entry));
      
      // Add to timeline (for get) - pushing ID
      pipeline.lPush(TIMELINE_KEY, id);

      // Add to form index (for delete) if formName exists
      if (formName) {
        pipeline.sAdd(`${FORM_INDEX_PREFIX}${formName}`, id);
      }
    }

    await pipeline.exec();
    
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
