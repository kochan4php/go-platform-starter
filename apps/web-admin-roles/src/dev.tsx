import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import RolesPage from "./RolesPage";
import "@starter/ui/styles.css";

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

const el = document.getElementById("root");
if (!el) throw new Error("#root element missing");
createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <RolesPage />
    </QueryClientProvider>
  </StrictMode>,
);
