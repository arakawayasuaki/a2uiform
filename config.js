const isLocalFile = window.location.protocol === "file:";
const isLocalHost = ["localhost", "127.0.0.1"].includes(
  window.location.hostname
);
const isLocalDev = isLocalFile || isLocalHost;

window.APP_CONFIG = {
  apiUrl: isLocalDev ? "http://localhost:8787/api/openai" : "/api/openai",
  apiBase: isLocalDev ? "http://localhost:8787" : "",
  model: "gpt-4o-mini",
};
