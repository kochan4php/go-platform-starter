#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const services = ["auth", "users", "rbac", "worker", "realtime", "gateway", "_template"];
const port = Number(process.env.DOCS_PORT ?? process.argv[2] ?? 8090);

const page = (service) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${service} API</title></head><body><script id="api-reference" data-url="/spec/${service}"></script><script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.66.1/dist/browser/standalone.js" crossorigin="anonymous"></script></body></html>`;
const index = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Developer portal</title><style>body{font:16px system-ui;max-width:900px;margin:3rem auto;padding:0 1rem}li{margin:.7rem 0}code{background:#eee;padding:.15rem .35rem}</style></head><body><h1>Developer portal</h1><p>Standalone entries:</p><ul><li><a href="http://127.0.0.1:5173">Web shell</a></li><li><a href="http://127.0.0.1:5174">Auth remote</a></li><li><a href="http://127.0.0.1:5175">Users remote</a></li><li><a href="http://127.0.0.1:5176">Roles remote</a></li></ul><p>Direct service specifications (no gateway):</p><ul>${services.map((service) => `<li><a href="/docs/${service}">${service}</a></li>`).join("")}</ul><p>Mailpit: <a href="http://127.0.0.1:8025">127.0.0.1:8025</a> · RedisInsight: <a href="http://127.0.0.1:5540">127.0.0.1:5540</a> · pgweb: <a href="http://127.0.0.1:8087">127.0.0.1:8087</a></p></body></html>`;

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const [, kind, service] = url.pathname.split("/");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (url.pathname === "/") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(index);
  } else if (kind === "docs" && services.includes(service)) {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(page(service));
  } else if (kind === "spec" && services.includes(service)) {
    response.setHeader("Content-Type", "application/yaml; charset=utf-8");
    response.end(readFileSync(join(root, "services", service, "openapi.yaml")));
  } else {
    response.statusCode = 404;
    response.end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`developer portal: http://127.0.0.1:${port}`));
