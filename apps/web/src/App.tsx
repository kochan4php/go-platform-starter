import { BrandMark, FooterStrip } from "@starter/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, type ReactNode, Suspense, lazy, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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

// Hand-drawn 16px stroke icons keep the host bundle free of icon libraries.
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

function IconMenu({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`size-[18px] ${className}`}
      aria-hidden
      focusable="false"
    >
      <title>menu</title>
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

function IconClose({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={`size-[18px] ${className}`}
      aria-hidden
      focusable="false"
    >
      <title>close</title>
      <path d="M3.5 3.5l9 9m0-9-9 9" />
    </svg>
  );
}

const NAV = [
  { to: "/admin/users", label: "Users", icon: IconUsers },
  { to: "/admin/roles", label: "Roles & Permissions", icon: IconShield },
] as const;

/** Catches render errors inside any federated remote so one broken screen
 *  never blanks the whole console. */
class RemoteErrorBoundary extends Component<
  { children: ReactNode; resetKey?: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    // Navigating to a different section clears the crash state automatically.
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <p className="mt-2 max-w-lg text-sm text-[var(--color-muted)]">
            {this.state.error.message || "An unexpected error occurred while loading this section."}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-xl border border-[var(--color-line)] px-3 py-1.5 text-sm hover:bg-white/5"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Sidebar({ open, onClose }: { open: boolean; onClose(): void }) {
  const { pathname } = useLocation();
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full w-[264px] shrink-0 transform flex-col justify-between border-r border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-8 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div>
        <BrandMark />
        <nav className="mt-12 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
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
              </Link>
            );
          })}
        </nav>
      </div>

      <SessionChip onLogout={onClose} />
    </aside>
  );
}

function SessionChip({ onLogout }: { onLogout(): void }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <p className="truncate text-sm font-semibold">{user.email}</p>
      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
        claims v{user.ver} · {user.perms.length} perms
      </p>
      <button
        type="button"
        onClick={() => {
          logout();
          onLogout();
        }}
        className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-danger)]"
      >
        <IconSignOut className="size-3.5" />
        Log out
      </button>
    </div>
  );
}

function DashboardShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const title = pathname.startsWith("/admin/roles") ? "Roles & permissions" : "Directory";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    // Fixed-height app shell: only this inner region scrolls; the sidebar and
    // chrome stay put no matter how long the page content is.
    <div className="flex h-screen overflow-hidden">
      {/* mobile scrim */}
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile bar */}
        <div className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-[var(--color-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-ink)]"
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
          <BrandMark />
        </div>

        <header className="border-b border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-5 md:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">Admin</p>
          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        </header>

        <main className="ui-stage flex-1 overflow-y-auto px-4 py-8 sm:px-6 md:px-8 md:py-10">{children}</main>

        <footer className="border-t border-[var(--color-line)] px-4 py-5 sm:px-6 md:px-8">
          <FooterStrip />
        </footer>
      </div>
    </div>
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

interface LoginResult {
  accessToken: string;
  user: { id: number | string; email: string; perms?: string[]; ver?: number };
}

function AuthRoutes(onLoggedIn: (u: LoginResult) => void) {
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

/** UI hint only — the gateway enforces truth server-side. */
function Gate() {
  const { user, login, booting } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleLoggedIn(res: LoginResult) {
    login(res.accessToken, {
      id: String(res.user.id),
      email: res.user.email,
      perms: res.user.perms ?? [],
      ver: res.user.ver ?? 0,
    });
    navigate("/admin/users", { replace: true });
  }

  // Hold rendering until the silent refresh settles, so deep links like
  // /admin/roles do not flash the auth branch and get redirected.
  if (booting && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
          Restoring session…
        </p>
      </div>
    );
  }

  return user ? (
    <DashboardShell>
      <RemoteErrorBoundary resetKey={pathname}>
        <AdminRoutes />
      </RemoteErrorBoundary>
    </DashboardShell>
  ) : (
    AuthRoutes(handleLoggedIn)
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <main className="min-h-screen w-full max-w-full overflow-x-hidden">
            <Gate />
          </main>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
