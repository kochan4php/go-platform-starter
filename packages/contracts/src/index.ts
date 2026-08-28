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
const DEVICE_KEY = "starter:device-id";

type GlobalWithToken = typeof globalThis & { [KEY]?: string };

export function setAccessToken(token: string | undefined) {
  (globalThis as GlobalWithToken)[KEY] = token;
}

export function getAccessToken(): string | undefined {
  return (globalThis as GlobalWithToken)[KEY];
}

export function getDeviceID(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(DEVICE_KEY, created);
  return created;
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
  PUT: ReturnType<typeof createFetchClient<paths>>["PUT"];
  DELETE: ReturnType<typeof createFetchClient<paths>>["DELETE"];
}

export interface CreateClientOptions {
  /** Gateway origin, e.g. http://127.0.0.1:8000 */
  baseUrl?: string;
  /** Called when silent refresh failed — the session is truly over. */
  onSessionExpired?: () => void;
}

/**
 * Gateway origin resolution order:
 *   1. VITE_GATEWAY_URL build-time override,
 *   2. window.__STARTER_GATEWAY_URL__ runtime override (rendered by the
 *      host's /config.js so one image serves every environment),
 *   3. same-origin (production edge serves shell + API on one domain),
 *   4. http://127.0.0.1:8000 bare dev fallback.
 * NEVER bake an absolute loopback URL into a production bundle — the
 * browser would call the visitor's own machine.
 */
declare global {
  interface Window {
    __STARTER_GATEWAY_URL__?: string;
  }
}

export const GATEWAY_URL = (() => {
  const fromEnv =
    typeof import.meta !== "undefined"
      ? (import.meta.env?.VITE_GATEWAY_URL as string | undefined)
      : undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const runtime = window.__STARTER_GATEWAY_URL__;
    if (runtime) return runtime.replace(/\/$/, "");
    if (/^https?:$/.test(window.location?.protocol ?? "")) return window.location.origin;
  }
  return "http://127.0.0.1:8000";
})();

/**
 * Typed client against the aggregate spec (PLAN items 58/59): bearer attach,
 * one silent refresh via the gateway httpOnly cookie on 401, retry-once.
 * Cheap to instantiate; the token itself lives on globalThis.
 */
/**
 * Single-flight silent refresh shared by every client instance across every
 * federated bundle: concurrent 401s wait on ONE refresh call instead of
 * racing cookie rotation against each other.
 */
let inflightRefresh: Promise<string | undefined> | null = null;
let crossTabToken: { value: string; at: number } | undefined;
const refreshChannel =
  typeof BroadcastChannel === "undefined" ? undefined : new BroadcastChannel("starter:auth");

refreshChannel?.addEventListener("message", (event: MessageEvent<{ type: string; token?: string }>) => {
  if (event.data?.type === "refresh:done" && event.data.token) {
    crossTabToken = { value: event.data.token, at: Date.now() };
    setAccessToken(event.data.token);
  }
});

async function refreshRequest(baseUrl: string): Promise<string | undefined> {
  const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Device-ID": getDeviceID() },
  });
  if (!res.ok) return undefined;
  const body = (await res.json()) as { data?: { accessToken?: string } };
  const token = body.data?.accessToken;
  if (!token) return undefined;
  crossTabToken = { value: token, at: Date.now() };
  setAccessToken(token);
  refreshChannel?.postMessage({ type: "refresh:done", token });
  return token;
}

export function silentRefresh(baseUrl = GATEWAY_URL): Promise<string | undefined> {
  if (!inflightRefresh) {
    const coordinated = async () => {
      const recent = crossTabToken;
      if (recent && Date.now() - recent.at < 2_000) return recent.value;
      return refreshRequest(baseUrl);
    };
    const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
    const refresh: Promise<string | undefined> = locks
      ? locks.request("starter-auth-refresh", coordinated).then((result) => result)
      : coordinated();
    inflightRefresh = refresh
      .catch(() => undefined)
      .finally(() => {
        inflightRefresh = null;
      });
  }
  return inflightRefresh;
}

export function createApiClient(opts: CreateClientOptions = {}): ApiClient {
  const baseUrl = opts.baseUrl ?? GATEWAY_URL;
  const client = createFetchClient<paths>({ baseUrl, credentials: "include" });

  client.use({
    onRequest({ request }) {
      const token = getAccessToken();
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      request.headers.set("X-Device-ID", getDeviceID());
      return request;
    },
    async onResponse({ request, response }) {
      const url = new URL(request.url);
      const skipRefresh = url.pathname.endsWith("/auth/refresh") || url.pathname.endsWith("/auth/login");
      if (response.status !== 401 || skipRefresh) return response;

      const token = await silentRefresh(baseUrl);
      if (!token) {
        setAccessToken(undefined);
        opts.onSessionExpired?.();
        window.dispatchEvent(new Event("starter:session-expired"));
        return response; // surface the original 401
      }
      // Retry the original call exactly once.
      request.headers.set("Authorization", `Bearer ${token}`);
      return fetch(request);
    },
  });

  return client as unknown as ApiClient;
}
