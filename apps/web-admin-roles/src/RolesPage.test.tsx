import { afterEach, expect, it, vi, type Mock } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RolesPage from "./RolesPage";

const getMock = vi.fn();

vi.mock("./api-client", () => ({
  api: {
    GET: (...a: unknown[]) => getMock(...a),
    POST: () => {},
    PATCH: () => {},
    DELETE: () => {},
  },
}));

afterEach(() => {
  cleanup();
  getMock.mockReset();
});

it("lists roles with their permission counts", async () => {
  (getMock as Mock).mockImplementation(async (path: string) => {
    if (path === "/api/v1/rbac/roles") {
      return {
        data: {
          success: true,
          message: "ok",
          data: {
            items: [
              {
                id: "22222222-2222-2222-2222-222222222222",
                name: "admin",
                description: "",
                permissions: ["user:read:any", "role:update:any"],
              },
            ],
            meta: { limit: 100, offset: 0, total: 1 },
          },
        },
      };
    }
    // permission catalog
    return {
      data: { success: true, message: "ok", data: { items: ["user:read:any", "role:update:any"] } },
    };
  });

  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RolesPage />
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(screen.getByText("admin")).toBeTruthy();
    expect(screen.getByText("2 assigned")).toBeTruthy();
  });
});
