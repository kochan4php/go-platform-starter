import { defineConfig } from "@playwright/test";

// The mesh must already be running: gateway on :8000, host preview on :5173,
// remotes on :5174-5176 — or the PRODUCTION edge when E2E_BASE_URL is set
// (scripts/deploy.sh stack). See the ci.yml playwright job — PLAN item 67.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    headless: true,
  },
});
