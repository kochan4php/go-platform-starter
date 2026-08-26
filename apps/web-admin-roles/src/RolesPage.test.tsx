import { ConfirmProvider, ToastProvider } from "@starter/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type Mock, afterEach, expect, it, vi } from "vitest";
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
      <ToastProvider>
        <ConfirmProvider>
          <RolesPage />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );

  await waitFor(() => {
    // the name renders twice by design: collapsed rail + unfolded panel
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(screen.getByText("2 assigned")).toBeTruthy();
  });

  fireEvent.click(screen.getByRole("button", { name: "New role" }));
  const createDialog = screen.getByRole("dialog", { name: "Create role" });
  expect(createDialog.classList.contains("ui-modal-panel")).toBe(true);
  expect(screen.getByText("Create resource")).toBeTruthy();
  expect(screen.getByText("Role details")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  fireEvent.click(screen.getByRole("button", { name: "Edit & sync" }));
  expect(screen.getByRole("dialog", { name: "Edit role: admin" })).toBeTruthy();
  expect(screen.getByText("Edit resource")).toBeTruthy();
});
