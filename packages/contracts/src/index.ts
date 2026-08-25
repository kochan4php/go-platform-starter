import createFetchClient from "openapi-fetch";
import type { paths } from "./gen";

/**
 * Token storage policy (PLAN item 69, docs/TOKEN_POLICY.md): the access token
 * lives in memory only; the refresh token is an httpOnly cookie owned by the
 * gateway/auth service.
 *
 * The backing store is a well-known property on globalThis instead of module
 * state: the host and every federated remote bundle their own copy of this
 * module, and the token must be visible across all of them.
 */
const KEY = "__starterAccessToken";

type GlobalWithToken = typeof globalThis & { [KEY]?: string };

export function setAccessToken(token: string | undefined) {
  (globalThis as GlobalWithToken)[KEY] = token;
}

export function getAccessToken(): string | undefined {
  return (globalThis as GlobalWithToken)[KEY];
}

export interface TokenClaims {
  sub: string;
  email?: string;
  perms?: string[];
  ver?: number;
}

/** Decode the JWT payload — UI hint data only, never trust boundaries here. */
export function decodeClaims(token: string): TokenClaims | undefined {
  const parts = token.split(".");
  if (parts.length < 2) return undefined;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64)) as TokenClaims;
  } catch {
    return undefined;
  }
}

export interface ApiClient {
  GET: ReturnType<typeof createFetchClient<paths>>["GET"];
  POST: ReturnType<typeof createFetchClient<paths>>["POST"];
  PATCH: ReturnType<typeof createFetchClient<paths>>["PATCH"];
  DELETE: ReturnType<typeof createFetchClient<paths>>["DELETE"];
}

export interface CreateClientOptions {
  /** Gateway origin, e.g. http://localhost:8000 */
  baseUrl?: string;
  /** Called when silent refresh failed — the session is truly over. */
  onSessionExpired?: () => void;
}

/**
 * Gateway origin resolution order (PLAN item 59):
 *   1. VITE_GATEWAY_URL build-time override,
 *   2. same-origin (production edge serves shell + API on one domain),
 *   3. http://localhost:8000 bare dev fallback.
 * NEVER bake an absolute localhost URL into a production bundle — the
 * browser would call the visitor's own machine.
 */
export const GATEWAY_URL = (() => {
  const fromEnv =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.VITE_GATEWAY_URL as string | undefined)
      : undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined" && /^https?:$/.test(window.location?.protocol ?? "")) {
    return window.location.origin;
  }
  return "http://localhost:8000";
})();

/**
 * Typed client against the aggregate spec (PLAN items 58/59): bearer attach,
 * one silent refresh via the gateway httpOnly cookie on 401, retry-once.
 * Cheap to instantiate; the token itself lives on globalThis.
 */
export function createApiClient(opts: CreateClientOptions = {}): ApiClient {
  const baseUrl = opts.baseUrl ?? GATEWAY_URL;
  const client = createFetchClient<paths>({ baseUrl, credentials: "include" });

  client.use({
    onRequest({ request }) {
      const token = getAccessToken();
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
    async onResponse({ request, response }) {
      const url = new URL(request.url);
      const skipRefresh = url.pathname.endsWith("/auth/refresh") || url.pathname.endsWith("/auth/login");
      if (response.status !== 401 || skipRefresh) return response;

      // Silent refresh: the httpOnly refresh cookie rides along automatically.
      const refreshed = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!refreshed.ok) {
        setAccessToken(undefined);
        opts.onSessionExpired?.();
        return response; // surface the original 401
      }
      const body = (await refreshed.json()) as { data: { accessToken: string } };
      setAccessToken(body.data.accessToken);

      // Retry the original call exactly once.
      request.headers.set("Authorization", `Bearer ${body.data.accessToken}`);
      return fetch(request);
    },
  });

  return client as unknown as ApiClient;
}
