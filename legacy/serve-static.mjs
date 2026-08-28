import { createRequire } from 'module'; const require = createRequire(import.meta.url);
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transform, buildSync } from "esbuild";
import { mkdirSync } from "node:fs";
const tsCache = /* @__PURE__ */ new Map();
async function transpileTs(content, filePath) {
  if (tsCache.has(filePath)) return tsCache.get(filePath);
  const result = await transform(content, {
    loader: "ts",
    format: "esm",
    target: "es2022",
    sourcemap: "inline"
  });
  tsCache.set(filePath, result.code);
  return result.code;
}
const PORT = Number(process.env.PORT) || 3e3;
process.env.NETLIFY_SITE_URL = `http://127.0.0.1:${PORT}`;
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = existsSync(join(HERE, "index.html")) ? HERE : normalize(process.cwd());
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".ts": "text/javascript; charset=utf-8",
  ".mts": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8"
};
function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}
let handlers = null;
async function loadHandlers() {
  if (!handlers) {
    const cacheDir = join(HERE, ".netlify");
    try {
      mkdirSync(cacheDir, { recursive: true });
    } catch {
    }
    const bundledPath = join(cacheDir, "_handlers-preview.mjs");
    try {
      buildSync({
        entryPoints: [join(HERE, "netlify/functions/_lib/handlers.ts")],
        bundle: true,
        outfile: bundledPath,
        format: "esm",
        platform: "node",
        target: "node22",
        logLevel: "warning"
      });
    } catch (e) {
      throw new Error("Failed to bundle handlers: " + e.message);
    }
    const mod = await import(pathToFileURL(bundledPath).href);
    handlers = mod.default || mod;
  }
  return handlers;
}
async function handleApi(req, res) {
  let raw = "";
  req.on("data", (c) => raw += c);
  req.on("end", async () => {
    let body = {};
    try {
      body = JSON.parse(raw || "{}");
    } catch {
    }
    if (!body.action) {
      const q = new URL(req.url, "http://localhost").searchParams;
      body.action = q.get("action") || void 0;
      if (body.action) body.payload = body.payload || q.get("payload") || void 0;
    }
    let out;
    try {
      const fwd = req.headers["x-forwarded-for"];
      const ip = (fwd ? String(fwd).split(",")[0].trim() : null) || req.socket.remoteAddress || null;
      const h = await loadHandlers();
      out = await h.handleAction(body.action, body.payload, body.sessionToken, {
        ip
      });
    } catch (e) {
      out = { success: false, message: "Error internal: " + e.message };
    }
    if (out && typeof out === "object" && typeof out.statusCode === "number" && out.body !== void 0) {
      res.writeHead(out.statusCode, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(String(out.body));
      return;
    }
    sendJson(res, 200, out);
  });
}
const NOOP_SW = [
  "/* ASJ Portal preview: service worker no-op (lihat serve-static.mjs) */",
  "self.addEventListener('install', (e) => { e.waitUntil(self.skipWaiting()); });",
  "self.addEventListener('activate', (e) => {",
  "  e.waitUntil(",
  "    (async () => {",
  "      const keys = await caches.keys();",
  "      await Promise.all(keys.map((k) => caches.delete(k)));",
  "      await self.clients.claim();",
  "    })(),",
  "  );",
  "});",
  "self.addEventListener('message', (e) => {",
  "  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();",
  "});"
].join("\n");
async function resolveFile(pathname) {
  if (pathname.endsWith("/")) pathname += "index.html";
  let file = normalize(join(ROOT, pathname));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) throw new Error("forbidden");
  try {
    let info = await stat(file);
    if (info.isDirectory()) {
      const idx = join(file, "index.html");
      info = await stat(idx);
      return idx;
    }
    return file;
  } catch {
  }
  if (file.endsWith(".js")) {
    const tsFile = file.slice(0, -3) + ".ts";
    try {
      await stat(tsFile);
      return tsFile;
    } catch {
    }
  }
  if (file.endsWith(".mjs")) {
    const mtsFile = file.slice(0, -4) + ".mts";
    try {
      await stat(mtsFile);
      return mtsFile;
    } catch {
    }
  }
  throw new Error("not found");
}
createServer(async (req, res) => {
  try {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if ((req.method === "POST" || req.method === "GET") && pathname.startsWith("/.netlify/functions/") && (req.method === "POST" || new URL(req.url, "http://localhost").searchParams.get("action") === "ping")) {
      handleApi(req, res);
      return;
    }
    if (req.method === "GET" && (pathname === "/api/share-data" || pathname === "/.netlify/functions/share-data")) {
      const q = new URL(req.url, "http://localhost").searchParams.get("job") || "";
      let out;
      try {
        const h2 = await loadHandlers();
        out = await h2.handleShareData(q);
      } catch (e) {
        out = { error: "Error internal: " + e.message };
      }
      sendJson(res, out.error ? 400 : 200, out);
      return;
    }
    const file = await resolveFile(pathname);
    let body = await readFile(file);
    const ext = extname(file).toLowerCase();
    if (ext === ".ts" || ext === ".mts") {
      body = Buffer.from(await transpileTs(body.toString(), file));
    }
    const headers = {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
    };
    if (ext === ".html" || ext === "") {
      headers["Clear-Site-Data"] = '"cache"';
    }
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`ASJ Portal preview server listening on http://0.0.0.0:${PORT}`);
});
