import { writeFile } from "node:fs/promises";

const endpoints = JSON.parse(process.env.STATUS_ENDPOINTS || "[]");
if (!Array.isArray(endpoints)) throw new Error("STATUS_ENDPOINTS must be a JSON array");

const checkedAt = new Date().toISOString();
const rows = await Promise.all(
  endpoints.map(async ({ name, url }) => {
    if (!name || !url) throw new Error("each status endpoint needs name and url");
    const started = performance.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "error" });
      return [
        String(name).replace(/[|\r\n]/g, " "),
        response.ok ? "Operational" : `Degraded (${response.status})`,
        Math.round(performance.now() - started),
      ];
    } catch {
      return [String(name).replace(/[|\r\n]/g, " "), "Unavailable", "-"];
    }
  }),
);

const body = rows.length
  ? rows.map(([name, status, latency]) => `| ${name} | ${status} | ${latency} |`).join("\n")
  : "| No public endpoints configured | Unknown | - |";
await writeFile(
  "docs/STATUS.md",
  `# Public status\n\nLast checked: ${checkedAt}\n\n| Service | Status | Latency (ms) |\n| --- | --- | ---: |\n${body}\n\nThis page is generated outside the production VPS by the documentation workflow. Incident communication remains authoritative.\n`,
);
