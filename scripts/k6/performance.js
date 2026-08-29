import { check, sleep } from "k6";
import http from "k6/http";

const base = __ENV.BASE_URL || "http://127.0.0.1:8010";
const mode = __ENV.K6_MODE || "users";

const scenarios = {
  users: {
    directory: {
      executor: "ramping-vus",
      exec: "usersList",
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "30s", target: 100 },
        { duration: "15s", target: 0 },
      ],
    },
  },
  login: {
    "login-storm": {
      executor: "constant-arrival-rate",
      exec: "loginStorm",
      rate: Number(__ENV.LOGIN_RATE || 25),
      timeUnit: "1s",
      duration: __ENV.LOGIN_DURATION || "2m",
      preAllocatedVUs: 25,
      maxVUs: 100,
    },
  },
  soak: {
    soak: {
      executor: "constant-vus",
      exec: "usersList",
      vus: Number(__ENV.SOAK_VUS || 25),
      duration: __ENV.SOAK_DURATION || "1h",
    },
  },
};

export const options = {
  scenarios: scenarios[mode] || scenarios.users,
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

export function usersList({ token }) {
  const response = http.get(`${base}/api/v1/users?limit=50&count=estimate`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: "users-list" },
  });
  check(response, { "users list is healthy": (r) => r.status === 200 || r.status === 304 });
  sleep(0.2);
}

export function loginStorm() {
  const response = http.post(
    `${base}/api/v1/auth/login`,
    JSON.stringify({
      email: __ENV.ADMIN_EMAIL || "admin@example.local",
      password: __ENV.ADMIN_PASSWORD || "local-root-access-2026!",
    }),
    { headers: { "Content-Type": "application/json" }, tags: { name: "login-storm" } },
  );
  check(response, { "login is bounded": (r) => r.status === 200 || r.status === 429 });
}

export default usersList;
