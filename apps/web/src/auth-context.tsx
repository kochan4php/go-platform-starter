import { decodeClaims, getAccessToken, setAccessToken } from "@starter/contracts";
import { useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  login(accessToken: string, user: SessionUser): void;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL as string | undefined) ?? "http://localhost:8000";

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
  const queryClient = useQueryClient();

  // Session restore (PLAN item 69): the access token lives in memory and dies
  // with the page; the httpOnly refresh cookie is what survives a reload. One
  // silent refresh at boot decides whether a session exists.
  useEffect(() => {
    if (initialUser != null) return;
    let cancelled = false;
    fetch(`${GATEWAY_URL}/api/v1/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (res) => (res.ok ? ((await res.json()) as { data?: { accessToken?: string } }) : null))
      .then((body) => {
        if (cancelled) return;
        const token = body?.data?.accessToken;
        if (!token) return;
        setAccessToken(token);
        const claims = decodeClaims(token);
        setUser({
          id: claims?.sub ?? "",
          email: claims?.email ?? "",
          perms: claims?.perms ?? [],
          ver: claims?.ver ?? 0,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
    // Bootstrap runs once per mount; initialUser is only a test seed.
  }, [initialUser]);

  const login = useCallback((accessToken: string, u: SessionUser) => {
    setAccessToken(accessToken);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${GATEWAY_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
    }).catch(() => undefined);
    setAccessToken(undefined);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(() => ({ user, booting, login, logout }), [user, booting, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

export { GATEWAY_URL };
