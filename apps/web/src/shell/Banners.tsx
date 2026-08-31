import { GATEWAY_URL, decodeClaims, silentRefresh } from "@starter/contracts";
import { useI18n } from "@starter/ui";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type SessionUser, useAuth } from "../auth-context";
import { useOnline } from "../lib/ui";

export function OfflineBanner() {
  const online = useOnline();
  const { t } = useI18n();
  if (online) return null;
  return (
    // biome-ignore lint/a11y/useSemanticElements: <output> is for command output; this is a banner with live status
    <div
      role="status"
      aria-live="polite"
      className="ui-status-banner border-b px-4 py-2 text-center text-xs font-medium"
    >
      {t("status.offline")}
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

export function ImpersonationBanner() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const actor = sessionStorage.getItem("auth:impersonator");
  if (!actor) return null;

  const exit = async () => {
    const token = sessionStorage.getItem("auth:original-token");
    const rawUser = sessionStorage.getItem("auth:original-user");
    if (!token || !rawUser) return;
    let user: SessionUser;
    try {
      user = JSON.parse(rawUser) as SessionUser;
    } catch {
      sessionStorage.removeItem("auth:impersonator");
      return;
    }
    const refreshed = await silentRefresh(GATEWAY_URL).catch(() => undefined);
    const claims = refreshed ? decodeClaims(refreshed) : undefined;
    const restored = claims?.sub
      ? {
          ...user,
          id: claims.sub,
          email: claims.email ?? user.email,
          perms: claims.perms ?? [],
          ver: claims.ver ?? 0,
        }
      : user;
    sessionStorage.removeItem("auth:impersonator");
    sessionStorage.removeItem("auth:original-token");
    sessionStorage.removeItem("auth:original-user");
    login(refreshed ?? token, restored, { broadcast: false });
    navigate("/admin/product", { replace: true });
  };

  return (
    <div
      role="alert"
      className="ui-status-banner flex items-center justify-center gap-3 border-b px-4 py-2 text-xs font-medium"
    >
      Read-only support session started by user {actor}.
      <button type="button" className="underline" onClick={() => void exit()}>
        Exit impersonation
      </button>
    </div>
  );
}
