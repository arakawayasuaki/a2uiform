const isLocalFile = window.location.protocol === "file:";

window.APP_CONFIG = {
  apiUrl: isLocalFile ? "http://localhost:8787/api/openai" : "/api/openai",
  model: "gpt-4o-mini",
};
