import { observeUserActions } from "@starter/contracts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./mocks";
import "./styles.css";
import { observeWebVitals } from "./lib/web-vitals";

observeWebVitals();
observeUserActions();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  });
}

const el = document.getElementById("root");
if (!el) throw new Error("#root element missing");
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
