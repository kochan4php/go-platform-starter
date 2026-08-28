import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./mocks";
import "./styles.css";
import { observeWebVitals } from "./lib/web-vitals";

observeWebVitals();

const el = document.getElementById("root");
if (!el) throw new Error("#root element missing");
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
