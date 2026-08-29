import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";

// The mesh must already be running: gateway on :8000, host preview on :5173,
// remotes on :5174-5176 — or the PRODUCTION edge when E2E_BASE_URL is set
// (scripts/deploy.sh stack). See the ci.yml playwright job — PLAN item 67.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    headless: true,
    storageState: {
      cookies: [],
      origins: [{ origin: baseURL, localStorage: [{ name: "whats-new:0.6.0", value: "true" }] }],
    },
    trace: "retain-on-failure",
  },
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.02 } },
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  projects: [
    {
      name: "desktop-chromium",
      grepInvert: /@mobile|@rate-limit/,
      use: { ...devices["Desktop Chrome"] },
    },
    { name: "mobile-chromium", grep: /@mobile/, use: { ...devices["Pixel 7"] } },
    { name: "rate-limit-chromium", grep: /@rate-limit/, use: { ...devices["Desktop Chrome"] } },
  ],
});
