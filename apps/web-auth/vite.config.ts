import federation from "@originjs/vite-plugin-federation";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
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
