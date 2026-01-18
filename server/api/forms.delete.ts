
import { getRedisClient } from '~/server/utils/redis';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const id = query.id as string;
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing id'
    });
  }
  
  const client = await getRedisClient();
  const formsKey = 'a2uiform:forms';
  const key = `a2uiform:form:${id}`;
  
  try {
    const multi = client.multi();
    multi.del(key);
    multi.sRem(formsKey, id);
    await multi.exec();
    
    return { success: true };
  } catch (e) {
    console.error('Failed to delete form', e);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete form'
    });
  }
});
