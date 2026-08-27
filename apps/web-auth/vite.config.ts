import federation from "@originjs/vite-plugin-federation";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// REMOTE_BASE lets the production edge serve this remote under a subpath
// (e.g. /remote/auth/) while keeping chunk URLs relative and correct.
const base = process.env.REMOTE_BASE || "/";

export default defineConfig({
  base,
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "web_auth",
      exposes: {
        "./LoginPage": "./src/LoginPage.tsx",
        "./RegisterPage": "./src/RegisterPage.tsx",
        "./ForgotPage": "./src/ForgotPage.tsx",
        "./ResetPage": "./src/ResetPage.tsx",
      },
      shared: ["react", "react-dom", "@tanstack/react-query"],
    }),
  ],
  build: { target: "es2022" },
});
