import { Button, Card, SkeletonBlock, SkeletonLine, usePreferences } from "@starter/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useLayoutEffect } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { RemoteErrorBoundary } from "./RemoteErrorBoundary";
import RequirePermission from "./RequirePermission";
import { AuthProvider, useAuth } from "./auth-context";
import { ConfirmProvider, DrawerProvider, ToastProvider, useStored, useTheme, useToast } from "./lib/ui";
import { DashboardShell } from "./shell/DashboardShell";

const LoginPage = lazy(() => import("web_auth/LoginPage"));
const RegisterPage = lazy(() => import("web_auth/RegisterPage"));
const ForgotPage = lazy(() => import("web_auth/ForgotPage"));
const ResetPage = lazy(() => import("web_auth/ResetPage"));
const UsersPage = lazy(() => import("web_admin_users/UsersPage"));
const RolesPage = lazy(() => import("web_admin_roles/RolesPage"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

interface LoginResult {
  accessToken: string;
  user: { id: number | string; email: string; perms?: string[]; ver?: number };
}

function AdminRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
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
        <Route path="/admin/403" element={<ForbiddenPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function AuthRoutes(onLoggedIn: (u: LoginResult) => void, resetKey: string) {
  return (
    <RemoteErrorBoundary resetKey={resetKey}>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/login" element={<LoginPage onLoggedIn={onLoggedIn} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot" element={<ForgotPage />} />
          <Route path="/reset" element={<ResetPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </RemoteErrorBoundary>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-2">
      <SkeletonLine w="w-1/3" />
      <SkeletonBlock h="h-36" />
      <SkeletonLine w="w-2/3" />
      <SkeletonLine w="w-1/2" />
      <SkeletonBlock h="h-64" />
    </div>
  );
}

function ForbiddenPage() {
  const { user } = useAuth();
  const toast = useToast();
  const requestAccess = () => {
    const text = `Access request from ${user?.email ?? "anonymous user"}`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast("success", "Access request copied for your administrator"))
      .catch(() => toast("error", "Could not copy the access request"));
  };
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <IconShield className="size-12 text-[var(--color-muted)]/40" />
      <h2 className="text-xl font-bold tracking-tight">Access denied</h2>
      <p className="max-w-sm text-sm text-[var(--color-muted)]">
        {user
          ? `Your account (${user.email}) does not have permission to view this page.`
          : "You need to sign in to view this page."}
      </p>
      <div className="flex items-center gap-3">
        {user ? <Button onClick={requestAccess}>Request access</Button> : null}
        <Link
          viewTransition
          to={user ? "/admin/users" : "/login"}
          className="text-sm text-[var(--color-accent)] underline underline-offset-4"
        >
          {user ? "Back to dashboard" : "Sign in"}
        </Link>
      </div>
    </div>
  );
}

function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-mono text-5xl font-extrabold tracking-tighter text-[var(--color-line)]">404</p>
      <h2 className="text-xl font-bold tracking-tight">Page not found</h2>
      <p className="text-sm text-[var(--color-muted)]">The page you are looking for does not exist.</p>
      <Link
        viewTransition
        to={user ? "/admin/users" : "/login"}
        className="text-sm text-[var(--color-accent)] underline underline-offset-4"
      >
        {user ? "Back to dashboard" : "Back to login"}
      </Link>
    </div>
  );
}

function SettingsPage() {
  const { user } = useAuth();
  const { timeZone, setTimeZone, soundEnabled, setSoundEnabled } = usePreferences();
  const zones = Array.from(
    new Set([
      timeZone,
      "UTC",
      "Asia/Bangkok",
      "Asia/Jakarta",
      "Asia/Singapore",
      "Europe/London",
      "America/New_York",
    ]),
  );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-accent)]">System</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Your console preferences</h2>
      </div>
      <Card title="Profile">
        <p id="profile" className="text-sm font-semibold">
          {user?.email}
        </p>
        <p className="mt-1 font-mono text-xs text-[var(--color-muted)]">
          claims v{user?.ver ?? 0} · {user?.perms.length ?? 0} permissions
        </p>
      </Card>
      <Card title="Display & feedback">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="ui-label block">Timezone</span>
            <select
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
              className="ui-input"
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-line)] p-4 text-sm">
            <span>
              <strong className="block">Sound feedback</strong>
              <span className="text-xs text-[var(--color-muted)]">
                Muted by default; plays a quiet cue for toasts.
              </span>
            </span>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
          </label>
        </div>
      </Card>
    </div>
  );
}

function IconShield({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
      focusable="false"
    >
      <title>shield</title>
      <path d="M8 1.5 13.5 3.5v4c0 3.2-2.3 5.6-5.5 7-3.2-1.4-5.5-3.8-5.5-7v-4L8 1.5Z" />
      <path d="m5.5 8 2 2 3-3.5" />
    </svg>
  );
}

function Gate() {
  const { user, login, logout, booting, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const toast = useToast();
  const isAuthPath = ["/login", "/register", "/forgot", "/reset"].includes(pathname);

  useEffect(() => {
    if (user) document.title = "Dashboard · Platform Console";
  }, [user]);

  useLayoutEffect(() => {
    if (!booting && !user && !isAuthPath) {
      sessionStorage.setItem("auth:return-to", pathname + search);
    }
  }, [booting, isAuthPath, pathname, search, user]);

  function handleLoggedIn(res: LoginResult) {
    login(res.accessToken, {
      id: String(res.user.id),
      email: res.user.email,
      perms: res.user.perms ?? [],
      ver: res.user.ver ?? 0,
    });
    const intent = sessionStorage.getItem("auth:return-to");
    sessionStorage.removeItem("auth:return-to");
    toast("success", `Welcome back, ${res.user.email}.`);
    navigate(intent?.startsWith("/admin/") ? intent : "/admin/users", { replace: true });
  }

  function handleReauthenticated(res: LoginResult) {
    login(res.accessToken, {
      id: String(res.user.id),
      email: res.user.email,
      perms: res.user.perms ?? [],
      ver: res.user.ver ?? 0,
    });
    toast("success", "Session restored.");
  }

  if (booting && !user) {
    return (
      <output className="ui-stage flex min-h-screen items-center justify-center p-5" aria-live="polite">
        <div className="w-full max-w-md space-y-4 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
            Restoring session…
          </p>
          <SkeletonLine w="w-2/3" />
          <SkeletonBlock h="h-14" />
          <SkeletonBlock h="h-14" />
        </div>
      </output>
    );
  }

  if (!user && !isAuthPath) return <Navigate to="/login" replace />;
  if (!user) return AuthRoutes(handleLoggedIn, pathname);

  return (
    <>
      <DashboardShell>
        <RemoteErrorBoundary resetKey={pathname}>
          <AdminRoutes />
        </RemoteErrorBoundary>
      </DashboardShell>
      {sessionExpired ? (
        <Suspense fallback={<PageSkeleton />}>
          <LoginPage
            onLoggedIn={handleReauthenticated}
            mode="reauth"
            onCancel={() => {
              sessionStorage.setItem("auth:return-to", pathname + search);
              logout().finally(() => navigate("/login", { replace: true }));
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}

function Root() {
  // Initialize theme + density at the root so the first paint isn't unstyled.
  useTheme();
  const [density] = useStored<"compact" | "comfortable">("ui-density", "comfortable");
  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);
  return <Gate />;
}

export default function App() {
  if (window.self !== window.top) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-danger)]">
            Embedding blocked
          </p>
          <h1 className="mt-3 text-2xl font-bold">Open Platform Console in its own tab.</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            This visual guard prevents clickjacking in development.
          </p>
        </div>
      </main>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <DrawerProvider>
            <AuthProvider>
              <BrowserRouter>
                <a
                  href="#main-content"
                  className="fixed left-3 top-3 z-[300] -translate-y-20 rounded-lg bg-[var(--color-ink)] px-3 py-2 text-sm font-semibold text-[var(--color-canvas)] transition-transform focus:translate-y-0"
                >
                  Skip to content
                </a>
                <div className="min-h-screen w-full max-w-full overflow-x-hidden">
                  <Root />
                </div>
              </BrowserRouter>
            </AuthProvider>
          </DrawerProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
