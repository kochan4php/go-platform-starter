import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    // React 19 ships `act` via react-dom/test-utils; ensure the dev bundle is
    // resolved by NOT setting NODE_ENV=production.
    env: {
      NODE_ENV: "test",
    },
  },
});
