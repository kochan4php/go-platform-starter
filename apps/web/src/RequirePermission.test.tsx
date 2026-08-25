import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, type SessionUser } from "./auth-context";
import RequirePermission from "./RequirePermission";

function mount(user: SessionUser | null, perm: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider initialUser={user}>
        <MemoryRouter initialEntries={["/admin/users"]}>
          <Routes>
            <Route path="/login" element={<p>login-page</p>} />
            <Route
              path="/admin/users"
              element={
                <RequirePermission perm={perm}>
                  <p>protected-content</p>
                </RequirePermission>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

it("redirects anonymous visitors to /login", async () => {
  mount(null, "user:read:any");
  // Booting starts true for anonymous mounts; the failed refresh settles it.
  await screen.findByText("login-page", {}, { timeout: 3000 });
});

it("blocks authenticated users without the permission", () => {
  mount(
    { id: "s1", email: "a@b.c", perms: [], ver: 1 },
    "user:read:any",
  );
  expect(screen.getByText(/do not have permission/i)).toBeTruthy();
});

it("renders children when the claim is present", () => {
  mount(
    { id: "s1", email: "a@b.c", perms: ["user:read:any"], ver: 1 },
    "user:read:any",
  );
  expect(screen.getByText("protected-content")).toBeTruthy();
});
