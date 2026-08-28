import { check, sleep } from "k6";
import http from "k6/http";

const base = __ENV.BASE_URL || "http://127.0.0.1:8010";

export const options = {
  scenarios: {
    directory: {
      executor: "ramping-vus",
      stages: [
        { duration: "15s", target: 25 },
        { duration: "30s", target: 50 },
        { duration: "15s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<250", "p(99)<500"],
  },
};

export function setup() {
  const response = http.post(
    `${base}/api/v1/auth/login`,
    JSON.stringify({
      email: __ENV.ADMIN_EMAIL || "admin@example.local",
      password: __ENV.ADMIN_PASSWORD || "local-root-access-2026!",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(response, { "login succeeds": (r) => r.status === 200 });
  return { token: response.json("data.accessToken") };
}

export default function ({ token }) {
  const response = http.get(`${base}/api/v1/users?limit=50&count=estimate`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: "users-list" },
  });
  check(response, { "users list is healthy": (r) => r.status === 200 || r.status === 304 });
  sleep(0.2);
}
