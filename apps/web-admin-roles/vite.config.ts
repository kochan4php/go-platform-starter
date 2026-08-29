import federation from "@originjs/vite-plugin-federation";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// REMOTE_BASE lets the production edge serve this remote under a subpath
// (e.g. /remote/auth/) while keeping chunk URLs relative and correct.
const base = process.env.REMOTE_BASE || "/";
const cdnOrigin = process.env.VITE_CDN_ORIGIN?.replace(/\/$/, "");

export default defineConfig({
  experimental: {
    renderBuiltUrl: (filename) => (cdnOrigin ? `${cdnOrigin}/${filename}` : { relative: true }),
  },
  base,
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "web_admin_roles",
      exposes: { "./RolesPage": "./src/RolesPage.tsx" },
      shared: ["react", "react-dom", "@tanstack/react-query", "@starter/ui", "@starter/contracts"],
    }),
  ],
  build: { target: "es2022", manifest: true },
  esbuild: { drop: ["console", "debugger"] },
});
