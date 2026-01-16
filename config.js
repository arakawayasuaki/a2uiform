const isLocalFile = window.location.protocol === "file:";

window.APP_CONFIG = {
  apiUrl: isLocalFile ? "http://localhost:8787/api/openai" : "/api/openai",
  apiBase: isLocalFile ? "http://localhost:8787" : "",
  model: "gpt-4o-mini",
};
