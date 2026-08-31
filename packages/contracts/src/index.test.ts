import { afterEach, expect, it, vi } from "vitest";
import {
  AppError,
  resolveGatewayURL,
  safeApiData,
  setAccessToken,
  shouldRetryQuery,
  silentRefresh,
} from "./index";
import { loginSchema, registerSchema, updateUserSchema } from "./schemas";

afterEach(() => {
  vi.restoreAllMocks();
  setAccessToken(undefined);
});

it("resolves every gateway URL branch without trailing slashes", () => {
  expect(resolveGatewayURL("https://build.example/", { runtime: "https://runtime.invalid" })).toBe(
    "https://build.example",
  );
  expect(resolveGatewayURL(undefined, { runtime: "https://runtime.example/" })).toBe(
    "https://runtime.example",
  );
  expect(resolveGatewayURL(undefined, { protocol: "https:", origin: "https://same.example" })).toBe(
    "https://same.example",
  );
  expect(resolveGatewayURL(undefined, { protocol: "file:", origin: "null" })).toBe("http://127.0.0.1:8000");
});

it("coalesces concurrent silent refresh calls into one request", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { accessToken: "fresh-token" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

  const [first, second, third] = await Promise.all([
    silentRefresh("http://127.0.0.1:8000"),
    silentRefresh("http://127.0.0.1:8000"),
    silentRefresh("http://127.0.0.1:8000"),
  ]);

  expect([first, second, third]).toEqual(["fresh-token", "fresh-token", "fresh-token"]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("generates runnable Zod request schemas from OpenAPI", () => {
  expect(
    registerSchema.safeParse({ email: "user@example.com", password: "long-enough-password" }).success,
  ).toBe(true);
  expect(registerSchema.safeParse({ email: "not-an-email", password: "short" }).success).toBe(false);
  expect(updateUserSchema.safeParse({ displayName: "Updated" }).success).toBe(true);
  expect(updateUserSchema.safeParse({ id: 42 }).success).toBe(false);
});

it("validates API data and discriminates retryable failures", () => {
  expect(safeApiData(loginSchema, { email: "user@example.com", password: "valid-password" })).toEqual({
    email: "user@example.com",
    password: "valid-password",
  });
  expect(() => safeApiData(loginSchema, { email: "invalid" })).toThrow(AppError);
  expect(shouldRetryQuery(0, new AppError("unavailable", "retry", 503))).toBe(true);
  expect(shouldRetryQuery(0, new AppError("forbidden", "stop", 403))).toBe(false);
  expect(shouldRetryQuery(2, new Error("retry limit"))).toBe(false);
});
