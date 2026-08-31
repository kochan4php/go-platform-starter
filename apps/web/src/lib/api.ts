import { AppError, GATEWAY_URL, apiEnvelopeSchema, getAccessToken, getDeviceID } from "@starter/contracts";

export async function secureRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GATEWAY_URL}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Authorization: `Bearer ${getAccessToken() ?? ""}`,
      "Content-Type": "application/json",
      "X-Device-ID": getDeviceID(),
      ...init.headers,
    },
  });
  const raw: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw AppError.fromResponse(response.status, raw);
  const parsed = apiEnvelopeSchema.safeParse(raw);
  if (!parsed.success)
    throw new AppError("invalid_response", "Server response did not match its contract", 502);
  return parsed.data.data as T;
}
