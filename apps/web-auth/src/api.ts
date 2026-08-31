import { createApiClient } from "@starter/contracts";

export const api = createApiClient();

export interface LoginResult {
  accessToken: string;
  user: { id: number; email: string };
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter = 0,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

export async function login(email: string, password: string, otp?: string): Promise<LoginResult> {
  const { data, error, response } = await api.POST("/api/v1/auth/login", { body: { email, password, otp } });
  if (error) throw apiError(error, response);
  const payload = data?.data as LoginResult | undefined;
  if (!payload?.accessToken) throw new Error("login returned no access token");
  return payload;
}

export async function register(email: string, password: string): Promise<{ id: number; email: string }> {
  const { data, error, response } = await api.POST("/api/v1/auth/register", { body: { email, password } });
  if (error) throw apiError(error, response);
  return data?.data as { id: number; email: string };
}

export async function verifyInvitation(
  token: string,
): Promise<{ name: string; attributes: { email?: string } }> {
  const { data, error, response } = await api.POST("/api/v1/users/product/invitations/verify", {
    body: { token },
  });
  if (error) throw apiError(error, response);
  return data?.data as { name: string; attributes: { email?: string } };
}

export async function forgot(email: string): Promise<void> {
  const { error, response } = await api.POST("/api/v1/auth/forgot", { body: { email } });
  if (error) throw apiError(error, response);
}

export async function requestMagicLink(email: string): Promise<void> {
  const { error, response } = await api.POST("/api/v1/auth/magic-link", { body: { email } });
  if (error) throw apiError(error, response);
}

export async function startOAuth(provider: "google" | "github"): Promise<string> {
  const { data, error, response } = await api.GET("/api/v1/auth/oauth/{provider}/start", {
    params: { path: { provider } },
  });
  if (error) throw apiError(error, response);
  const payload = data?.data as { authorizationUrl?: string } | undefined;
  if (!payload?.authorizationUrl) throw new Error("OAuth provider returned no authorization URL");
  return payload.authorizationUrl;
}

export async function validateReset(token: string): Promise<void> {
  const { error, response } = await api.POST("/api/v1/auth/reset/validate", { body: { token } });
  if (error) throw apiError(error, response);
}

export async function reset(token: string, newPassword: string): Promise<void> {
  const { error, response } = await api.POST("/api/v1/auth/reset", {
    body: { token, newPassword },
  });
  if (error) throw apiError(error, response);
}

function apiError(error: unknown, response: Response): AuthApiError {
  const retryAfter = Number.parseInt(response.headers.get("Retry-After") ?? "0", 10);
  return new AuthApiError(readMessage(error), response.status, Number.isFinite(retryAfter) ? retryAfter : 0);
}

function readMessage(err: unknown): string {
  const e = err as { message?: string; error?: string };
  if (e?.message === "mfa_required") return "mfa_required";
  if (e?.message === "invalid_credentials") return "Email or password is incorrect.";
  if (e?.message === "conflict") return "That email is already registered.";
  if (e?.message === "rate_limited" || e?.message === "too many requests") {
    return "Too many requests. Please wait before trying again.";
  }
  if (e?.error) return e.error;
  if (e?.message === "bad_request") return "The request could not be validated.";
  if (e?.message) return e.message.replaceAll("_", " ");
  // 401 from login/register is intentionally uniform — keep it that way here.
  return "invalid credentials or request";
}
