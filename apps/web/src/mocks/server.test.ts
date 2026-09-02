import { afterAll, beforeAll, expect, test } from "vitest";
import { mockServer } from "./server.ts";

beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
afterAll(() => mockServer.close());

test("node mock server serves the typed users envelope", async () => {
  const response = await fetch("http://127.0.0.1:8010/api/v1/users");
  const body = (await response.json()) as { success: boolean; data: { items: unknown[] } };
  expect(response.status).toBe(200);
  expect(body.success).toBe(true);
  expect(body.data.items).toHaveLength(1);
});
