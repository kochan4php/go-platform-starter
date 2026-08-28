import { GATEWAY_URL, decodeClaims, getAccessToken, setAccessToken, silentRefresh } from "@starter/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface SessionUser {
  id: string;
  email: string;
  perms: string[];
  ver: number;
}

interface AuthState {
  user: SessionUser | null;
  /** True until the initial refresh-cookie bootstrap has settled. */
  booting: boolean;
  sessionExpired: boolean;
  login(accessToken: string, user: SessionUser): void;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  /** Test/dev seeding; production sessions bootstrap via the refresh cookie. */
  initialUser?: SessionUser | null;
}) {
  const [user, setUser] = useState<SessionUser | null>(initialUser ?? null);
  const [booting, setBooting] = useState(initialUser == null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const queryClient = useQueryClient();

  // Session restore (PLAN item 69): the access token lives in memory and dies
  // with the page; the httpOnly refresh cookie is what survives a reload. One
  // silent refresh at boot decides whether a session exists.
  useEffect(() => {
    if (initialUser != null) return;
    let cancelled = false;
    // Single-flight: StrictMode (and any duplicate callers) share ONE refresh
    // call, so cookie rotation can never be mistaken for token reuse.
    silentRefresh(GATEWAY_URL)
      .then((token) => {
        if (cancelled || !token) return;
        const claims = decodeClaims(token);
        setUser({
          id: claims?.sub ?? "",
          email: claims?.email ?? "",
          perms: claims?.perms ?? [],
          ver: claims?.ver ?? 0,
        });
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
    // Bootstrap runs once per mount; initialUser is only a test seed.
  }, [initialUser]);

  useEffect(() => {
    const onExpired = () => {
      setAccessToken(undefined);
      setSessionExpired(true);
    };
    window.addEventListener("starter:session-expired", onExpired);
    return () => window.removeEventListener("starter:session-expired", onExpired);
  }, []);

  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void silentRefresh(GATEWAY_URL).then((token) => {
        if (!token) window.dispatchEvent(new Event("starter:session-expired"));
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  const login = useCallback((accessToken: string, u: SessionUser) => {
    setAccessToken(accessToken);
    setUser(u);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${GATEWAY_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
    }).catch(() => undefined);
    setAccessToken(undefined);
    setUser(null);
    setSessionExpired(false);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, booting, sessionExpired, login, logout }),
    [user, booting, sessionExpired, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

export { GATEWAY_URL };
