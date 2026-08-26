import { useEffect, useState } from "react";
import { useOnline } from "../lib/ui";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: <output> is for command output; this is a banner with live status
    <div
      role="status"
      aria-live="polite"
      className="ui-status-banner border-b px-4 py-2 text-center text-xs font-medium"
    >
      You are offline — some features may be unavailable.
    </div>
  );
}

/**
 * Warns the user ~60 seconds before the access token expires. We use the JWT
 * `exp` claim read from the in-memory token (set on each silent refresh).
 */
export function SessionExpiringBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      const raw = (globalThis as { __starterAccessToken?: string }).__starterAccessToken;
      if (!raw) {
        setShowBanner(false);
        return;
      }
      try {
        const payload = raw.split(".")[1];
        if (!payload) return;
        const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
        const json = atob(padded);
        const exp = (JSON.parse(json) as { exp?: number }).exp;
        if (!exp) return;
        const ms = exp * 1000 - Date.now();
        if (cancelled) return;
        setShowBanner(ms > 0 && ms < 60_000);
      } catch {
        /* malformed token — ignore */
      }
    };
    tick();
    const t = setInterval(tick, 5_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!showBanner) return null;
  return (
    <div role="alert" className="ui-status-banner border-b px-4 py-2 text-center text-xs font-medium">
      Session expiring — please save your work.
    </div>
  );
}
