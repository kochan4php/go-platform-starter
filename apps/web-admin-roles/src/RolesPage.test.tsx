import { ConfirmProvider, ToastProvider } from "@starter/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RolesPage from "./RolesPage";

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();
const deleteMock = vi.fn();
const putMock = vi.fn();

vi.mock("./api-client", () => ({
  api: {
    GET: (...args: unknown[]) => getMock(...args),
    POST: (...args: unknown[]) => postMock(...args),
    PATCH: (...args: unknown[]) => patchMock(...args),
    DELETE: (...args: unknown[]) => deleteMock(...args),
    PUT: (...args: unknown[]) => putMock(...args),
  },
}));

const roles = [
  {
    id: 1,
    name: "admin",
    description: "**Full** platform access",
    permissions: ["user:read:any", "role:update:any"],
    color: "#dc2626",
    icon: "crown",
    archived: false,
    createdAt: "2026-08-20T00:00:00Z",
    userCount: 2,
    system: true,
  },
  {
    id: 2,
    name: "support",
    description: "Customer support",
    permissions: ["user:read:any"],
    color: "#6366f1",
    icon: "users",
    archived: false,
    createdAt: "2026-08-21T00:00:00Z",
    userCount: 4,
    system: false,
  },
];
const permissions = [
  { name: "role:update:any", createdAt: "2026-08-20T00:00:00Z", roleCount: 1 },
  { name: "user:read:any", createdAt: "2026-08-20T00:00:00Z", roleCount: 2 },
  { name: "report:export:any", createdAt: "2026-08-27T00:00:00Z", roleCount: 0 },
];

function setupApi() {
  getMock.mockImplementation(async (path: string) => {
    if (path === "/api/v1/rbac/roles") return { data: { data: { items: roles } } };
    if (path === "/api/v1/rbac/permissions") return { data: { data: { items: permissions } } };
    if (path === "/api/v1/users") return { data: { data: { items: [], meta: { total: 0 } } } };
    return { data: { data: { items: [] } } };
  });
  postMock.mockResolvedValue({ data: { data: {} } });
  patchMock.mockResolvedValue({ data: { data: {} } });
  deleteMock.mockResolvedValue({ data: { data: {} } });
  putMock.mockResolvedValue({ data: { data: {} } });
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <ConfirmProvider>
          <RolesPage />
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("searches roles, protects the system role, and exposes the permission matrix", async () => {
  setupApi();
  renderPage();

  expect(await screen.findByRole("heading", { name: "Roles & permissions" })).toBeTruthy();
  expect(screen.getByText("2 users assigned")).toBeTruthy();
  expect(screen.getByRole("button", { name: /delete/i }).hasAttribute("disabled")).toBe(true);

  fireEvent.change(screen.getByRole("searchbox", { name: "Search roles" }), { target: { value: "support" } });
  fireEvent.click(screen.getByRole("button", { name: /support/ }));
  expect(screen.getByText("Customer support")).toBeTruthy();
  expect(screen.queryByText("Full platform access")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Matrix" }));
  expect((screen.getByRole("checkbox", { name: "support: user:read:any" }) as HTMLInputElement).checked).toBe(
    true,
  );
  expect(
    (screen.getByRole("checkbox", { name: "support: role:update:any" }) as HTMLInputElement).checked,
  ).toBe(false);
});

it("groups, searches, validates, and previews permissions in the role editor", async () => {
  setupApi();
  renderPage();
  await screen.findByRole("heading", { name: "Roles & permissions" });

  fireEvent.click(screen.getByRole("button", { name: "New role" }));
  const dialog = screen.getByRole("dialog", { name: "Create role" });
  expect(dialog.classList.contains("ui-modal-panel")).toBe(true);
  expect(within(dialog).getByText("Permissions")).toBeTruthy();
  expect(await within(dialog).findByRole("button", { name: /^▾ report/ })).toBeTruthy();

  const name = dialog.querySelector<HTMLInputElement>('input[maxlength="60"]');
  if (!name) throw new Error("role name field is missing");
  fireEvent.change(name, { target: { value: "Bad Name" } });
  expect(within(dialog).getByText(/lowercase letters/)).toBeTruthy();

  fireEvent.change(within(dialog).getByLabelText("New permission name"), { target: { value: "invalid" } });
  expect(within(dialog).getByText(/Expected resource:action:scope/)).toBeTruthy();

  fireEvent.change(within(dialog).getByRole("searchbox", { name: "Search permissions" }), {
    target: { value: "report" },
  });
  expect(
    [...dialog.querySelectorAll("code")].some((element) => element.textContent === "report:export:any"),
  ).toBe(true);
  expect(within(dialog).getByText("New")).toBeTruthy();
  expect(within(dialog).getByRole("button", { name: "Delete" })).toBeTruthy();
});

it("compares roles and calculates effective permissions without writes", async () => {
  setupApi();
  renderPage();
  await screen.findByRole("heading", { name: "Roles & permissions" });

  fireEvent.click(screen.getByRole("button", { name: "Compare" }));
  expect(screen.getByRole("dialog", { name: "Compare roles" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Done" }));

  fireEvent.click(screen.getByRole("button", { name: "Simulate access" }));
  const dialog = screen.getByRole("dialog", { name: "Simulate access" });
  fireEvent.click(within(dialog).getByLabelText("support"));
  fireEvent.change(within(dialog).getByLabelText("Permission to test"), {
    target: { value: "user:read:any" },
  });
  expect(within(dialog).getByText("Allowed via support.")).toBeTruthy();
  expect(postMock).not.toHaveBeenCalled();
  expect(patchMock).not.toHaveBeenCalled();
});
