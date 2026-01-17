import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function getRedisClient() {
  if (client?.isOpen) {
    return client;
  }

  const config = useRuntimeConfig();
  const redisUrl = config.redisUrl as string;
  if (!redisUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "REDIS_URL is not set",
    });
  }

  client = createClient({ url: redisUrl });
  client.on("error", (error: unknown) => {
    console.error("redis_error", error);
  });
  await client.connect();
  return client;
}
