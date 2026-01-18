
import { getRedisClient } from '~/server/utils/redis';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = await getRedisClient();
  const formsKey = 'a2uiform:forms';
  
  if (!body || !body.formSpec) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid form data'
    });
  }

  const now = new Date().toISOString(); // Use ISO string for better sorting parity, though original used generic string
  // Original used toLocaleString('ja-JP'). Let's stick to simple execution for now, maybe use ISO for machine sorting and display formatting on frontend?
  // The original implementation used toLocaleString. I will use ISO for storage consistency and convert on frontend or just keep string.
  // Actually, let's keep it consistent with the frontend logic I wrote before so migration is easier if we did it. 
  // But for sorting in the GET endpoint, ISO 8601 is much better.
  
  const id = body.id || `form_${Date.now()}`;
  const isNew = !body.id;
  
  const newEntry = {
    id,
    name: body.name || body.formSpec.title || '無題',
    prompt: body.prompt || '',
    formSpec: body.formSpec,
    createdAt: body.createdAt || now,
    updatedAt: now
  };
  
  const key = `a2uiform:form:${id}`;
  
  try {
    const multi = client.multi();
    multi.set(key, JSON.stringify(newEntry));
    multi.sAdd(formsKey, id);
    await multi.exec();
    
    return newEntry;
  } catch (e) {
    console.error('Failed to save form', e);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save form'
    });
  }
});
