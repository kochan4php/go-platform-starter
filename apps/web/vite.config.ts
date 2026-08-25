import federation from "@originjs/vite-plugin-federation";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Runtime-configurable remote URLs: window.__REMOTE_URLS__ is served as a
// static /config.js next to the host (nginx image ships a default). Defaults
// match the local dev port map. With externalType "promise" the plugin wraps
// this expression as () => EXPR and calls .then() on the result — so EXPR
// must resolve to the remoteEntry.js URL.
const remoteEntry = (name: string, port: number) =>
  `Promise.resolve((window.__REMOTE_URLS__ && window.__REMOTE_URLS__['${name}']) || 'http://localhost:${port}/assets/remoteEntry.js')`;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "web_host",
      remotes: {
        web_auth: { external: remoteEntry("web_auth", 5174), externalType: "promise" },
        web_admin_users: { external: remoteEntry("web_admin_users", 5175), externalType: "promise" },
        web_admin_roles: { external: remoteEntry("web_admin_roles", 5176), externalType: "promise" },
      },
      shared: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
    }),
  ],
  build: {
    target: "es2022",
    minify: "esbuild",
  },
});
