import { ConfirmProvider, DrawerProvider, PreferencesProvider, ToastProvider } from "@starter/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Mock, afterEach, expect, it, vi } from "vitest";
import UsersPage, { deviceLabel } from "./UsersPage";

const getMock = vi.fn();
const deleteMock = vi.fn();

vi.mock("./api-client", () => ({
  api: {
    GET: (...a: unknown[]) => getMock(...a),
    POST: (...a: unknown[]) => deleteMock(...a),
    PATCH: (...a: unknown[]) => deleteMock(...a),
    DELETE: (...a: unknown[]) => deleteMock(...a),
  },
}));

afterEach(() => {
  cleanup();
  getMock.mockReset();
  deleteMock.mockReset();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function mount() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <ConfirmProvider>
          <DrawerProvider>
            <PreferencesProvider userKey="test-user">
              <UsersPage />
            </PreferencesProvider>
          </DrawerProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

it("maps common user agents to stable device labels", () => {
  expect(deviceLabel("Mozilla/5.0 (iPhone) Version/18 Mobile Safari/604.1")).toContain("Safari");
  expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0) Chrome/140.0")).toContain("Windows");
  expect(deviceLabel("Mozilla/5.0 (X11; Linux x86_64) Firefox/141.0")).toContain("Firefox");
  expect(deviceLabel("")).toHaveLength(1);
});

it("renders the paginated table and deletes a profile", async () => {
  (getMock as Mock).mockImplementation(async (path: string) => ({
    data: {
      success: true,
      message: "ok",
      data:
        path === "/api/v1/rbac/roles"
          ? { items: [] }
          : path === "/api/v1/users/stats"
            ? { total: 1, online: 0, registrations: [] }
            : {
                items: [
                  {
                    id: 111,
                    email: "ada@example.local",
                    displayName: "Ada",
                    avatarUrl: "",
                    status: "active",
                    roles: [],
                  },
                ],
                meta: { limit: 20, offset: 0, total: 1 },
              },
    },
  }));
  (deleteMock as Mock).mockResolvedValue({ data: { success: true }, error: undefined });

  mount();
  await waitFor(() => expect(screen.getByText("Users (1)")).toBeTruthy());
  // the name renders twice by design: latest-arrival card + table row
  expect(screen.getAllByText("Ada").length).toBeGreaterThan(0);
  const table = screen.getByRole("table");
  expect(table.classList.contains("w-full")).toBe(true);
  expect(table.style.width).toBe("");
  expect(table.style.minWidth).not.toBe("");
  expect(screen.queryByRole("columnheader", { name: "Email" })).toBeNull();
  const profilesSummary = screen.getByTestId("profiles-summary");
  expect(profilesSummary.classList.contains("grid-cols-1")).toBe(true);
  expect(profilesSummary.classList.contains("sm:grid-cols-2")).toBe(true);

  fireEvent.change(screen.getByRole("searchbox", { name: "Search users" }), {
    target: { value: "ada" },
  });
  await waitFor(() =>
    expect(
      getMock.mock.calls.some(
        ([path, options]) =>
          path === "/api/v1/users" &&
          (options as { params?: { query?: { q?: string } } })?.params?.query?.q === "ada",
      ),
    ).toBe(true),
  );
  fireEvent.click(screen.getByRole("button", { name: "online" }));
  await waitFor(() =>
    expect(
      getMock.mock.calls.some(
        ([path, options]) =>
          path === "/api/v1/users" &&
          (options as { params?: { query?: { presence?: string } } })?.params?.query?.presence === "online",
      ),
    ).toBe(true),
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Rows per page" }), { target: { value: "10" } });
  await waitFor(() =>
    expect(
      getMock.mock.calls.some(
        ([path, options]) =>
          path === "/api/v1/users" &&
          (options as { params?: { query?: { limit?: number } } })?.params?.query?.limit === 10,
      ),
    ).toBe(true),
  );

  fireEvent.click(screen.getByRole("row", { name: /Ada ada@example\.local/i }));
  const detailDrawer = screen.getByRole("dialog", { name: "User details" });
  expect(within(detailDrawer).getAllByText("Ada")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  fireEvent.click(screen.getByRole("button", { name: "New user" }));
  const createDialog = screen.getByRole("dialog", { name: "Register user" });
  expect(createDialog.classList.contains("ui-modal-panel")).toBe(true);
  const modalRoot = createDialog.closest(".ui-modal-root");
  expect(modalRoot?.parentElement).toBe(document.body);
  expect(screen.getByText("Create resource")).toBeTruthy();
  expect(screen.getByText("Identity and login")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByRole("dialog", { name: "Edit user" })).toBeTruthy();
  expect(screen.getByText("Credentials")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  // The delete button now opens a confirm dialog — accept it.
  vi.spyOn(window, "prompt").mockReturnValue("ada@example.local");
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  // The confirm dialog renders with the title "Delete Ada?" and a "Delete" confirm button.
  await waitFor(() => screen.getByRole("dialog", { name: /Delete Ada/i }));
  // Click the confirm button inside the dialog (it's also labeled "Delete").
  const buttons = screen.getAllByRole("button", { name: "Delete" });
  vi.useFakeTimers();
  fireEvent.click(buttons[buttons.length - 1]);
  expect(deleteMock).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(5_000));
  expect(deleteMock).toHaveBeenCalledTimes(2);
  expect(deleteMock).toHaveBeenNthCalledWith(
    1,
    "/api/v1/auth/users/{id}/sessions",
    expect.objectContaining({ params: { path: { id: 111 } } }),
  );
  expect(deleteMock).toHaveBeenNthCalledWith(
    2,
    "/api/v1/users/{id}",
    expect.objectContaining({ params: { path: { id: 111 } } }),
  );
});
