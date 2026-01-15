const http = require("http");

const PORT = process.env.PORT || 8787;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY が未設定です。");
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

const server = http.createServer(async (request, response) => {
  const startedAt = Date.now();
  const requestId = Math.random().toString(36).slice(2, 8);
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    console.log(`[${requestId}] OPTIONS ${request.url}`);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/openai") {
    console.log(`[${requestId}] ${request.method} ${request.url} -> 404`);
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not Found" }));
    return;
  }

  console.log(`[${requestId}] POST ${request.url} -> upstream`);
  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });

  request.on("end", async () => {
    try {
      const apiResponse = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY || ""}`,
        },
        body,
      });

      const data = await apiResponse.text();
      response.writeHead(apiResponse.status, {
        "Content-Type":
          apiResponse.headers.get("content-type") || "application/json",
      });
      response.end(data);
      console.log(
        `[${requestId}] upstream ${apiResponse.status} (${
          Date.now() - startedAt
        }ms)`
      );
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          error: "Proxy error",
          message: error.message,
        })
      );
      console.log(`[${requestId}] error ${error.message}`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`OpenAI proxy listening on http://localhost:${PORT}/api/openai`);
});
