import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
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

// Hand-drawn 16px stroke icons — keeps the host bundle free of any icon
// library; remotes can afford richer sets.
function IconUsers({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`size-4 ${className}`}
      aria-hidden
      focusable="false"
    >
      <title>icon</title>
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
      <path d="M11 3a2.5 2.5 0 0 1 0 5M12 9.7c1.6.5 2.5 1.7 2.5 3.3" />
    </svg>
  );
}

function IconShield({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`size-4 ${className}`}
      aria-hidden
      focusable="false"
    >
      <title>icon</title>
      <path d="M8 1.5 13.5 3.5v4c0 3.2-2.3 5.6-5.5 7-3.2-1.4-5.5-3.8-5.5-7v-4L8 1.5Z" />
      <path d="m5.5 8 2 2 3-3.5" />
    </svg>
  );
}

function IconSignOut({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`size-4 ${className}`}
      aria-hidden
      focusable="false"
    >
      <title>icon</title>
      <path d="M6 2H3v12h3M10.5 11 14 8l-3.5-3M14 8H6" />
    </svg>
  );
}

const NAV = [
  { to: "/admin/users", label: "Users", icon: IconUsers },
  { to: "/admin/roles", label: "Roles", icon: IconShield },
] as const;

function Sidebar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col justify-between border-r border-[var(--color-line)] px-6 py-8">
      <div>
        <a href="/" className="flex items-center gap-3 font-bold tracking-tight">
          <span className="block size-2 rounded-full bg-[var(--color-accent)]" />
          Platform Console
        </a>
        <nav className="mt-12 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <a
                key={to}
                href={to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-white/5 font-semibold text-[var(--color-ink)]"
                    : "text-[var(--color-muted)] hover:bg-white/5 hover:text-[var(--color-ink)]"
                }`}
              >
                <Icon className={active ? "text-[var(--color-accent)]" : ""} />
                {label}
                {active ? (
                  <span className="ml-auto block size-1.5 rounded-full bg-[var(--color-accent)]" />
                ) : null}
              </a>
            );
          })}
        </nav>
      </div>

      <SessionChip onLogout={logout} />
    </aside>
  );
}

function SessionChip({ onLogout }: { onLogout(): Promise<void> }) {
  const user = useAuth().user;
  if (!user) return null;
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <p className="truncate text-sm font-semibold">{user.email}</p>
      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
        claims v{user.ver} · {user.perms.length} perms
      </p>
      <button
        type="button"
        onClick={() => onLogout()}
        className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-danger)]"
      >
        <IconSignOut className="size-3.5" />
        Log out
      </button>
    </div>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const title = pathname.startsWith("/admin/roles") ? "Roles & permissions" : "Directory";

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/80 px-8 py-5 backdrop-blur-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">Admin</p>
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        </header>

        <main className="flex-1 px-8 py-10">{children}</main>

        <footer className="border-t border-[var(--color-line)] px-8 py-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">
            go-platform-starter · spec-first · schema-per-service
          </p>
        </footer>
      </div>
    </div>
  );
}

interface LoginResult {
  accessToken: string;
  user: { id: string; email: string; perms?: string[]; ver?: number };
}

function renderAuthRoutes(onLoggedIn: (u: LoginResult) => void) {
  return (
    <Suspense fallback={<p className="px-8 py-10 text-sm text-[var(--color-muted)]">Loading…</p>}>
      <Routes>
        <Route path="/login" element={<LoginPage onLoggedIn={onLoggedIn} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot" element={<ForgotPage />} />
        <Route path="/reset" element={<ResetPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

function AdminRoutes() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--color-muted)]">Loading…</p>}>
      <Routes>
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
        <Route path="*" element={<Navigate to="/admin/users" replace />} />
      </Routes>
    </Suspense>
  );
}

/** UI hint only — the gateway enforces truth server-side. */
function Gate() {
  const { user, login } = useAuth();

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

  return user ? (
    <DashboardShell>
      <AdminRoutes />
    </DashboardShell>
  ) : (
    renderAuthRoutes(handleLoggedIn)
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <main className="ui-stage min-h-screen w-full max-w-full overflow-x-hidden">
            <Gate />
          </main>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
