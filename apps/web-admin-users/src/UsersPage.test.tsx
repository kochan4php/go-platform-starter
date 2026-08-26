import { ConfirmProvider, DrawerProvider, PreferencesProvider, ToastProvider } from "@starter/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Mock, afterEach, expect, it, vi } from "vitest";
import UsersPage from "./UsersPage";

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

it("renders the paginated table and deletes a profile", async () => {
  (getMock as Mock).mockResolvedValue({
    data: {
      success: true,
      message: "ok",
      data: {
        items: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            email: "ada@example.local",
            displayName: "Ada",
            avatarUrl: "",
          },
        ],
        meta: { limit: 20, offset: 0, total: 1 },
      },
    },
  });
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
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  // The confirm dialog renders with the title "Delete Ada?" and a "Delete" confirm button.
  await waitFor(() => screen.getByRole("dialog", { name: /Delete Ada/i }));
  // Click the confirm button inside the dialog (it's also labeled "Delete").
  const buttons = screen.getAllByRole("button", { name: "Delete" });
  vi.useFakeTimers();
  fireEvent.click(buttons[buttons.length - 1]);
  expect(deleteMock).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTimeAsync(5_000));
  expect(deleteMock).toHaveBeenCalledTimes(1);
  const [, opts] = (deleteMock as Mock).mock.calls[0] as [string, { params: { path: { id: string } } }];
  expect(opts.params.path.id).toBe("11111111-1111-1111-1111-111111111111");
});
