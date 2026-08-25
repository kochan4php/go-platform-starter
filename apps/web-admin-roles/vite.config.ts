import federation from "@originjs/vite-plugin-federation";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "web_admin_roles",
      exposes: { "./RolesPage": "./src/RolesPage.tsx" },
      shared: ["react", "react-dom", "@tanstack/react-query"],
    }),
  ],
  build: { target: "es2022" },
});
