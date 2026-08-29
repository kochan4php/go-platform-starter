import { expect, test } from "@playwright/test";

const gateway = process.env.E2E_GATEWAY_URL ?? "http://127.0.0.1:8000";

test("login regenerates the session and IDOR writes are denied", async ({ request }) => {
  const suffix = Date.now();
  const firstEmail = `security-a-${suffix}@example.local`;
  const secondEmail = `security-b-${suffix}@example.local`;
  const password = "Security-pass-1";

  const first = await request.post(`${gateway}/api/v1/auth/register`, {
    data: { email: firstEmail, password },
  });
  const second = await request.post(`${gateway}/api/v1/auth/register`, {
    data: { email: secondEmail, password },
  });
  expect(first.status()).toBe(201);
  expect(second.status()).toBe(201);
  const secondID = (await second.json()).data.id as number;

  const loginA = await request.post(`${gateway}/api/v1/auth/login`, {
    data: { email: firstEmail, password },
    headers: { "X-Device-ID": "security-device-a" },
  });
  const loginB = await request.post(`${gateway}/api/v1/auth/login`, {
    data: { email: firstEmail, password },
    headers: { "X-Device-ID": "security-device-b" },
  });
  expect(loginA.status()).toBe(200);
  expect(loginB.status()).toBe(200);
  const tokenA = (await loginA.json()).data.accessToken as string;
  await loginB.json();
  expect(loginA.headers()["set-cookie"]).not.toBe(loginB.headers()["set-cookie"]);

  const idor = await request.patch(`${gateway}/api/v1/users/${secondID}`, {
    data: { id: secondID, displayName: "must not change" },
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  expect(idor.status()).toBe(403);
});
