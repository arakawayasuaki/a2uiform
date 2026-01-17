// https://nuxt.com/docs/api/configuration/nuxt-config
const env = import.meta.env as Record<string, string | undefined>;

export default defineNuxtConfig({
  srcDir: ".",
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@nuxt/ui"],
  colorMode: {
    preference: "light",
    fallback: "light",
  },
  css: ["assets/css/tailwind.css"],
  app: {
    head: {
      meta: [
        { name: "color-scheme", content: "light" },
        { name: "supported-color-schemes", content: "light" },
      ],
    },
  },
  runtimeConfig: {
    openaiApiKey: env.OPENAI_API_KEY || "",
    redisUrl: env.REDIS_URL || "redis://127.0.0.1:6379",
  },
});
