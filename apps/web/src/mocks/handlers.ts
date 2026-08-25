import { http, HttpResponse } from "msw";

// Offline-dev handlers mirroring the aggregate API envelope. Keep shapes in
// lockstep with services/*/openapi.yaml — the generated types are the truth.
export const handlers = [
  http.post("*/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return HttpResponse.json({ success: false, message: "invalid", error: "bad_request" }, { status: 400 });
    }
    return HttpResponse.json({
      success: true,
      message: "logged in",
      data: {
        accessToken: "mock-access",
        user: { id: "00000000-0000-0000-0000-000000000001", email: body.email },
      },
    });
  }),

  http.get("*/api/v1/users", () =>
    HttpResponse.json({
      success: true,
      message: "ok",
      data: {
        items: [{ id: "00000000-0000-0000-0000-000000000001", displayName: "Admin", avatarUrl: "" }],
        meta: { limit: 20, offset: 0, total: 1 },
      },
    }),
  ),

  http.get("*/api/v1/rbac/roles", () =>
    HttpResponse.json({
      success: true,
      message: "ok",
      data: {
        items: [
          {
            id: "00000000-0000-0000-0000-0000000000a1",
            name: "admin",
            description: "",
            permissions: ["user:read:any"],
          },
        ],
        meta: { limit: 100, offset: 0, total: 1 },
      },
    }),
  ),
];
