import { expect, test } from "@playwright/test";

const gateway = process.env.E2E_GATEWAY_URL ?? "http://127.0.0.1:8000";

test("spoofed X-Forwarded-For cannot evade edge rate limiting @rate-limit", async ({ request }) => {
  let limited = false;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const response = await request.post(`${gateway}/api/v1/auth/login`, {
      data: { email: `rate-limit-${attempt}@example.invalid`, password: "wrong-password" },
      headers: { "X-Forwarded-For": `198.51.100.${attempt + 1}` },
    });
    if (response.status() === 429) {
      limited = true;
      break;
    }
  }
  expect(limited).toBe(true);
});
