// Re-exports from @starter/ui so existing imports keep working. The actual
// implementation lives in packages/ui/src/ui-system.tsx so every federated
// remote gets the same providers when the host mounts them once.
export {
  ConfirmProvider,
  DrawerProvider,
  PreferencesProvider,
  ScrollToTop,
  ToastProvider,
  useConfirm,
  useCopy,
  useDrawer,
  useOnline,
  usePageVisible,
  usePreferences,
  useStored,
  useToast,
  formatNumber,
  formatDateTime,
  relativeTime,
  type ConfirmFn,
  type ToastApi,
  type UserPreferences,
} from "@starter/ui";

// Host-only additions: theme toggle, gateway health, scroll lock helpers
// that are not needed by remotes.
import { useCallback, useEffect, useState } from "react";

type Theme = "dark" | "light";
const THEME_KEY = "starter-theme";

function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.documentElement.style.colorScheme = t;
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [selected, setSelected] = useState<Theme | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem(THEME_KEY) as Theme | null;
    return saved === "light" || saved === "dark" ? saved : null;
  });
  const [system, setSystem] = useState<Theme>(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark",
  );
  const theme = selected ?? system;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => setSystem(media.matches ? "light" : "dark");
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const choose = useCallback((next: Theme) => {
    setSelected(next);
    window.localStorage.setItem(THEME_KEY, next);
  }, []);

  return [theme, choose];
}

export type HealthState = "ok" | "down" | "unknown";

export function useGatewayHealth(intervalMs = 30_000): HealthState {
  const [state, setState] = useState<HealthState>("unknown");

  useEffect(() => {
    let cancelled = false;
    const base =
      (typeof window !== "undefined" &&
        (window as { __STARTER_GATEWAY_URL__?: string }).__STARTER_GATEWAY_URL__) ||
      "";
    const ping = () => {
      if (document.hidden) return;
      fetch(`${base}/healthz`, { method: "GET", credentials: "omit" })
        .then((r) => !cancelled && setState(r.ok ? "ok" : "down"))
        .catch(() => !cancelled && setState("down"));
    };
    ping();
    const t = setInterval(ping, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [intervalMs]);

  return state;
}
