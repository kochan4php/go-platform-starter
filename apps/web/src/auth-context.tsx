import { GATEWAY_URL, decodeClaims, getAccessToken, setAccessToken, silentRefresh } from "@starter/contracts";
import { useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

export interface SessionUser {
  id: string;
  email: string;
  perms: string[];
  roles?: string[];
  ver: number;
}

interface AuthState {
  user: SessionUser | null;
  /** True until the initial refresh-cookie bootstrap has settled. */
  booting: boolean;
  sessionExpired: boolean;
  lastHeartbeatAt: number | null;
  login(accessToken: string, user: SessionUser): void;
  logout(): Promise<void>;
}

interface AuthSession {
  user: SessionUser | null;
  booting: boolean;
  sessionExpired: boolean;
  lastHeartbeatAt: number | null;
}

type AuthAction =
  | { type: "restored"; user: SessionUser | null; at: number | null }
  | { type: "login"; user: SessionUser; at: number }
  | { type: "heartbeat"; at: number }
  | { type: "expired" }
  | { type: "logout" };

function authReducer(state: AuthSession, action: AuthAction): AuthSession {
  switch (action.type) {
    case "restored":
      return {
        ...state,
        user: action.user,
        booting: false,
        lastHeartbeatAt: action.at,
      };
    case "login":
      return { user: action.user, booting: false, sessionExpired: false, lastHeartbeatAt: action.at };
    case "heartbeat":
      return { ...state, sessionExpired: false, lastHeartbeatAt: action.at };
    case "expired":
      return { ...state, booting: false, sessionExpired: true };
    case "logout":
      return { user: null, booting: false, sessionExpired: false, lastHeartbeatAt: null };
  }
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
  const [state, dispatch] = useReducer(authReducer, {
    user: initialUser ?? null,
    booting: initialUser == null,
    sessionExpired: false,
    lastHeartbeatAt: null,
  });
  const channel = useRef<BroadcastChannel | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const next = new BroadcastChannel("starter:session");
    channel.current = next;
    next.onmessage = (
      event: MessageEvent<{ type: "login"; token: string; user: SessionUser } | { type: "logout" }>,
    ) => {
      if (event.data.type === "login") {
        setAccessToken(event.data.token);
        dispatch({ type: "login", user: event.data.user, at: Date.now() });
      } else {
        setAccessToken(undefined);
        dispatch({ type: "logout" });
        queryClient.clear();
      }
    };
    return () => {
      channel.current = null;
      next.close();
    };
  }, [queryClient]);

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
        if (!claims?.sub) {
          setAccessToken(undefined);
          dispatch({ type: "restored", user: null, at: null });
          return;
        }
        dispatch({
          type: "restored",
          at: Date.now(),
          user: {
            id: claims.sub,
            email: claims.email ?? "",
            perms: claims.perms ?? [],
            ver: claims.ver ?? 0,
          },
        });
      })
      .finally(() => {
        if (!cancelled && !getAccessToken()) dispatch({ type: "restored", user: null, at: null });
      });
    return () => {
      cancelled = true;
    };
    // Bootstrap runs once per mount; initialUser is only a test seed.
  }, [initialUser]);

  useEffect(() => {
    const onExpired = () => {
      setAccessToken(undefined);
      dispatch({ type: "expired" });
    };
    window.addEventListener("starter:session-expired", onExpired);
    return () => window.removeEventListener("starter:session-expired", onExpired);
  }, []);

  useEffect(() => {
    if (!state.user) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void silentRefresh(GATEWAY_URL).then((token) => {
        if (!token) window.dispatchEvent(new Event("starter:session-expired"));
        else dispatch({ type: "heartbeat", at: Date.now() });
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [state.user]);

  const login = useCallback((accessToken: string, u: SessionUser) => {
    setAccessToken(accessToken);
    dispatch({ type: "login", user: u, at: Date.now() });
    channel.current?.postMessage({ type: "login", token: accessToken, user: u });
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${GATEWAY_URL}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
    }).catch(() => undefined);
    setAccessToken(undefined);
    dispatch({ type: "logout" });
    channel.current?.postMessage({ type: "logout" });
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(() => ({ ...state, login, logout }), [state, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

export { GATEWAY_URL };
