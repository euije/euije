import { createServer } from "node:http";
import synthesize from "../api/synthesize.ts";
import voices from "../api/voices.ts";

const handlers = {
  "/api/synthesize": synthesize,
  "/api/voices": voices,
};
const MAX_BODY_BYTES = 64 * 1024;

function attachVercelResponseHelpers(res) {
  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };
  res.json = (data) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(data));
    return res;
  };
  res.send = (data) => {
    res.end(data);
    return res;
  };
}

async function readJsonBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  attachVercelResponseHelpers(res);
  const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1:3001");
  const handler = handlers[requestUrl.pathname];
  if (!handler) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const origin = req.headers.origin;
  if (typeof origin === "string") {
    try {
      req.headers["x-forwarded-host"] = new URL(origin).host;
    } catch {
      res.status(403).json({ error: "요청 주소를 확인할 수 없어요." });
      return;
    }
  }

  if (req.method === "POST") {
    try {
      req.body = await readJsonBody(req);
    } catch {
      res.status(413).json({ error: "요청 내용이 너무 커요." });
      return;
    }
  }

  try {
    await handler(req, res);
  } catch {
    if (!res.headersSent) res.status(500).json({ error: "로컬 API에서 오류가 발생했어요." });
  }
});

server.listen(3001, "127.0.0.1", () => {
  process.stdout.write("Local TTS API listening on http://127.0.0.1:3001\n");
});
