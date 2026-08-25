// Standalone dev entry — the host loads the exposed modules in production.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LoginPage from "./LoginPage";
import "@starter/ui/styles.css";

const el = document.getElementById("root");
if (!el) throw new Error("#root element missing");
createRoot(el).render(
  <StrictMode>
    <LoginPage onLoggedIn={() => undefined} />
  </StrictMode>,
);
