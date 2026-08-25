import { defineConfig } from "@playwright/test";

// The mesh must already be running: gateway on :8000, host preview on :5173,
// remotes on :5174-5176. See scripts/e2e-mesh.sh (local) and the ci.yml
// playwright job — PLAN item 67.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:5173",
    headless: true,
  },
});
