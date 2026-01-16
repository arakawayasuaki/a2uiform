const http = require("http");
const fs = require("fs/promises");
const path = require("path");

process.on("warning", (warning) => {
  if (warning?.code === "DEP0169") {
    return;
  }
  console.warn(warning);
});

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
  response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
}

const dataDir = path.join(__dirname, ".data");
const submissionsFile = path.join(dataDir, "submissions.json");

async function readSubmissions() {
  try {
    const data = await fs.readFile(submissionsFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeSubmissions(items) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(submissionsFile, JSON.stringify(items, null, 2), "utf8");
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

  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/api/submissions") {
    if (request.method === "GET") {
      const items = await readSubmissions();
      const flattened = [];
      items.forEach((entry) => {
        if (Array.isArray(entry.items)) {
          entry.items.forEach((item) => flattened.push(item));
          return;
        }
        flattened.push(entry);
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ items: flattened }));
      console.log(
        `[${requestId}] GET /api/submissions -> 200 (${
          Date.now() - startedAt
        }ms)`
      );
      return;
    }
    if (request.method === "DELETE") {
      const formName = new URL(
        request.url,
        "http://localhost"
      ).searchParams.get("formName");
      if (!formName) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "formName is required" }));
        console.log(`[${requestId}] DELETE /api/submissions -> 400`);
        return;
      }
      const items = await readSubmissions();
      const remaining = items.filter((item) => item.formName !== formName);
      await writeSubmissions(remaining);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ ok: true, removed: items.length - remaining.length })
      );
      console.log(
        `[${requestId}] DELETE /api/submissions -> 200 (${
          Date.now() - startedAt
        }ms)`
      );
      return;
    }
    if (request.method !== "POST") {
      response.writeHead(405, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Method Not Allowed" }));
      console.log(`[${requestId}] ${request.method} /api/submissions -> 405`);
      return;
    }

    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const items = await readSubmissions();
        const now = new Date().toISOString();
        const entries = Array.isArray(payload.items)
          ? payload.items.map((item) => ({
              ...item,
              createdAt: item.createdAt || now,
            }))
          : [
              {
                ...payload,
                createdAt: payload.createdAt || now,
              },
            ];
        items.unshift(...entries);
        await writeSubmissions(items);
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true, count: entries.length }));
        console.log(
          `[${requestId}] POST /api/submissions -> 200 (${
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
    return;
  }

  if (request.method !== "POST" || pathname !== "/api/openai") {
    console.log(`[${requestId}] ${request.method} ${pathname} -> 404`);
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
