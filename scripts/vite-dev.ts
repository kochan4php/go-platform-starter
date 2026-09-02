import { readFileSync } from "node:fs";

const gateway = process.env.DEV_GATEWAY_TARGET ?? "http://127.0.0.1:8010";

export function localDevServer() {
  const https =
    process.env.DEV_HTTPS === "1"
      ? {
          cert: readFileSync(process.env.DEV_HTTPS_CERT ?? "tmp/certs/localhost.pem"),
          key: readFileSync(process.env.DEV_HTTPS_KEY ?? "tmp/certs/localhost-key.pem"),
        }
      : undefined;
  const proxy = Object.fromEntries(
    ["/api", "/docs", "/healthz", "/readyz", "/version", "/telemetry", "/ws"].map((path) => [
      path,
      { target: gateway, changeOrigin: true, secure: false, ws: path === "/ws" },
    ]),
  );
  return { host: "127.0.0.1", https, proxy };
}
