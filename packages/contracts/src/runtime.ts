import { z } from "zod";

export const apiEnvelopeSchema = z
  .object({
    data: z.unknown().optional(),
    message: z.string().optional(),
    error: z.object({ code: z.string().optional(), message: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();

export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 500,
    readonly retryable = status >= 500 || status === 429,
  ) {
    super(message);
    this.name = "AppError";
  }

  static fromResponse(status: number, body: unknown): AppError {
    const parsed = apiEnvelopeSchema.safeParse(body);
    const payload = parsed.success ? parsed.data : undefined;
    return new AppError(
      payload?.error?.code ?? `http_${status}`,
      payload?.error?.message ?? payload?.message ?? "Request failed",
      status,
    );
  }
}

export function safeApiData<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AppError("invalid_response", "Server response did not match its contract", 502, false);
  return result.data;
}

export function shouldRetryQuery(failures: number, error: unknown): boolean {
  if (failures >= 2) return false;
  return error instanceof AppError ? error.retryable : true;
}
