import { ConfirmProvider, DrawerProvider, PreferencesProvider, ToastProvider } from "@starter/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import UsersPage from "./UsersPage";
import "@starter/ui/styles.css";

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

const el = document.getElementById("root");
if (!el) throw new Error("#root element missing");
createRoot(el).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <ConfirmProvider>
          <DrawerProvider>
            <PreferencesProvider userKey="standalone-dev">
              <UsersPage />
            </PreferencesProvider>
          </DrawerProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
