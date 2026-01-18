
import { getRedisClient } from '~/server/utils/redis';

export default defineEventHandler(async (event) => {
  const client = await getRedisClient();
  const formsKey = 'a2uiform:forms';
  
  try {
    // Get all form IDs
    const formIds = await client.sMembers(formsKey);
    
    if (!formIds || formIds.length === 0) {
      return [];
    }
    
    // Get all form data
    const keys = formIds.map(id => `a2uiform:form:${id}`);
    const formsJson = await client.mGet(keys);
    
    const forms = formsJson
      .filter(json => json !== null)
      .map(json => JSON.parse(json!))
      .sort((a, b) => {
        // Sort by updatedAt or createdAt desc
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
      
    return forms;
  } catch (e) {
    console.error('Failed to fetch forms', e);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch forms'
    });
  }
});
