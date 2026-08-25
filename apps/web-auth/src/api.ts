import { createApiClient } from "@starter/contracts";

export const api = createApiClient();

export interface LoginResult {
  accessToken: string;
  user: { id: string; email: string };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const { data, error } = await api.POST("/api/v1/auth/login", { body: { email, password } });
  if (error) throw new Error(readMessage(error));
  const payload = data?.data as LoginResult | undefined;
  if (!payload?.accessToken) throw new Error("login returned no access token");
  return payload;
}

export async function register(email: string, password: string): Promise<{ id: string; email: string }> {
  const { data, error } = await api.POST("/api/v1/auth/register", { body: { email, password } });
  if (error) throw new Error(readMessage(error));
  return data?.data as { id: string; email: string };
}

export async function forgot(email: string): Promise<void> {
  const { error } = await api.POST("/api/v1/auth/forgot", { body: { email } });
  if (error) throw new Error(readMessage(error));
}

export async function reset(token: string, newPassword: string): Promise<void> {
  const { error } = await api.POST("/api/v1/auth/reset", {
    body: { token, newPassword },
  });
  if (error) throw new Error(readMessage(error));
}

function readMessage(err: unknown): string {
  const e = err as { message?: string };
  if (e?.message) return e.message;
  // 401 from login/register is intentionally uniform — keep it that way here.
  return "invalid credentials or request";
}
