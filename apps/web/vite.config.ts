import { URL, fileURLToPath } from "node:url";
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
  `Promise.resolve((window.__REMOTE_URLS__ && window.__REMOTE_URLS__['${name}']) || 'http://127.0.0.1:${port}/assets/remoteEntry.js')`;

const cdnOrigin = process.env.VITE_CDN_ORIGIN?.replace(/\/$/, "");

// Development runs WITHOUT federation: remote pages resolve straight to
// workspace sources through aliases, giving instant HMR across apps. The
// federation plugin is production-only.
const devAliases = {
  "web_auth/LoginPage": fileURLToPath(new URL("../web-auth/src/LoginPage.tsx", import.meta.url)),
  "web_auth/RegisterPage": fileURLToPath(new URL("../web-auth/src/RegisterPage.tsx", import.meta.url)),
  "web_auth/ForgotPage": fileURLToPath(new URL("../web-auth/src/ForgotPage.tsx", import.meta.url)),
  "web_auth/ResetPage": fileURLToPath(new URL("../web-auth/src/ResetPage.tsx", import.meta.url)),
  "web_admin_users/UsersPage": fileURLToPath(
    new URL("../web-admin-users/src/UsersPage.tsx", import.meta.url),
  ),
  "web_admin_roles/RolesPage": fileURLToPath(
    new URL("../web-admin-roles/src/RolesPage.tsx", import.meta.url),
  ),
};

export default defineConfig({
  experimental: {
    renderBuiltUrl: (filename) => (cdnOrigin ? `${cdnOrigin}/${filename}` : { relative: true }),
  },
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
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
      // Router is host-only; sharing it would ship the entire package instead
      // of letting Rollup tree-shake the small subset used by the shell.
      shared: ["react", "react-dom", "@tanstack/react-query"],
    }),
  ],
  ...(process.env.NODE_ENV === "development"
    ? {
        resolve: {
          alias: devAliases,
          // Aliased remote sources must resolve these to the SAME copies as
          // the host, or React/Query contexts split and hooks silently die.
          dedupe: ["react", "react-dom", "@tanstack/react-query"],
        },
        plugins: [react(), tailwindcss()],
      }
    : {}),
  build: {
    manifest: true,
    target: "es2022",
    modulePreload: { polyfill: false },
    minify: "terser",
    terserOptions: {
      compress: {
        passes: 3,
        booleans_as_integers: true,
        drop_console: true,
        keep_fargs: false,
        unsafe: true,
        pure_getters: true,
        unsafe_arrows: true,
        unsafe_methods: true,
      },
      format: { comments: false },
      module: true,
    },
  },
});
