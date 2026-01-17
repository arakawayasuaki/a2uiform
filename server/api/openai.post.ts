export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "OPENAI_API_KEY is not set",
    });
  }

  const body = await readBody(event);
  const response = await $fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body,
  });

  return response;
});
