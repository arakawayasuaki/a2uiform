// https://nuxt.com/docs/api/configuration/nuxt-config
const env = import.meta.env as Record<string, string | undefined>;

export default defineNuxtConfig({
  srcDir: ".",
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui"],
  css: ["assets/css/tailwind.css"],
  runtimeConfig: {
    openaiApiKey: env.OPENAI_API_KEY || "",
    redisUrl: env.REDIS_URL || "redis://127.0.0.1:6379",
  },
});
