import { getRedisClient } from "../utils/redis";

const TIMELINE_KEY = "a2uiform:timeline";
const SUBMISSION_PREFIX = "a2uiform:submission:";
const FORM_INDEX_PREFIX = "a2uiform:index:form:";

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
    const formIndexKey = `${FORM_INDEX_PREFIX}${formName}`;
    
    // Get all IDs belonging to this form
    const ids = await redis.sMembers(formIndexKey);
    
    if (ids.length === 0) {
       return { ok: true, removed: 0 };
    }

    const pipeline = redis.multi();
    
    // 1. Delete actual data keys
    const dataKeys = ids.map(id => `${SUBMISSION_PREFIX}${id}`);
    pipeline.del(dataKeys);
    
    // 2. Remove IDs from timeline
    // LREM removes elements matching the value. 
    // Ideally we should process this carefully if the list is huge, but it's better than fetching everything.
    ids.forEach(id => {
        pipeline.lRem(TIMELINE_KEY, 0, id);
    });

    // 3. Delete the index itself
    pipeline.del(formIndexKey);

    await pipeline.exec();

    return { ok: true, removed: ids.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createError({
      statusCode: 500,
      statusMessage: "Redis delete failed",
      data: { message },
    });
  }
});
