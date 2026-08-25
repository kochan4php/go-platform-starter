import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RequirePermission from "./RequirePermission";
import { AuthProvider, useAuth } from "./auth-context";

const LoginPage = lazy(() => import("web_auth/LoginPage"));
const RegisterPage = lazy(() => import("web_auth/RegisterPage"));
const ForgotPage = lazy(() => import("web_auth/ForgotPage"));
const ResetPage = lazy(() => import("web_auth/ResetPage"));
const UsersPage = lazy(() => import("web_admin_users/UsersPage"));
const RolesPage = lazy(() => import("web_admin_roles/RolesPage"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Shell() {
  const { user, login, logout } = useAuth();
  function handleLoggedIn(res: {
    accessToken: string;
    user: { id: string; email: string; perms?: string[]; ver?: number };
  }) {
    login(res.accessToken, {
      id: res.user.id,
      email: res.user.email,
      perms: res.user.perms ?? [],
      ver: res.user.ver ?? 0,
    });
    window.location.assign("/admin/users");
  }
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-white px-6 py-3">
        <a href="/" className="font-semibold">
          Platform
        </a>
        {user ? (
          <nav className="flex items-center gap-4 text-sm">
            <a href="/admin/users">Users</a>
            <a href="/admin/roles">Roles</a>
            <span className="text-[var(--color-muted)]">{user.email}</span>
            <button type="button" onClick={() => logout()} className="underline">
              Log out
            </button>
          </nav>
        ) : null}
      </header>
      <main className="mx-auto max-w-4xl p-6">
        <Suspense fallback={<p className="p-8 text-sm text-[var(--color-muted)]">Loading…</p>}>
          <Routes>
            <Route path="/login" element={<LoginPage onLoggedIn={handleLoggedIn} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot" element={<ForgotPage />} />
            <Route path="/reset" element={<ResetPage />} />
            <Route
              path="/admin/users"
              element={
                <RequirePermission perm="user:read:any">
                  <UsersPage />
                </RequirePermission>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <RequirePermission perm="role:read:any">
                  <RolesPage />
                </RequirePermission>
              }
            />
            <Route path="*" element={<Navigate to={user ? "/admin/users" : "/login"} replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
