import { shouldRetryQuery } from "@starter/contracts";
import {
  Button,
  Card,
  Field,
  I18nProvider,
  Input,
  SkeletonBlock,
  SkeletonLine,
  WidgetBoundary,
  WidgetSuspense,
  useI18n,
  usePreferences,
} from "@starter/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type FormEvent, Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { RemoteErrorBoundary } from "./RemoteErrorBoundary";
import RequirePermission from "./RequirePermission";
import { AuthProvider, useAuth } from "./auth-context";
import { secureRequest } from "./lib/api";
import {
  ConfirmProvider,
  DrawerProvider,
  ToastProvider,
  useConfirm,
  useStored,
  useTheme,
  useToast,
} from "./lib/ui";
import { DashboardShell } from "./shell/DashboardShell";

const LoginPage = lazy(() => import("web_auth/LoginPage"));
const RegisterPage = lazy(() => import("web_auth/RegisterPage"));
const ForgotPage = lazy(() => import("web_auth/ForgotPage"));
const ResetPage = lazy(() => import("web_auth/ResetPage"));
const UsersPage = lazy(() => import("web_admin_users/UsersPage"));
const RolesPage = lazy(() => import("web_admin_roles/RolesPage"));
const ProductPage = lazy(() => import("./ProductPage"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetryQuery, staleTime: 30_000, gcTime: 10 * 60_000 } },
});

interface LoginResult {
  accessToken: string;
  user: { id: number | string; email: string; perms?: string[]; ver?: number };
}

function AdminRoutes() {
  return (
    <Routes>
      <Route
        path="/admin/users"
        element={
          <RequirePermission perm="user:read:any">
            <WidgetBoundary title="User directory unavailable">
              <WidgetSuspense label="Loading user directory">
                <UsersPage />
              </WidgetSuspense>
            </WidgetBoundary>
          </RequirePermission>
        }
      />
      <Route
        path="/admin/roles"
        element={
          <RequirePermission perm="role:read:any">
            <WidgetBoundary title="Roles unavailable">
              <WidgetSuspense label="Loading roles">
                <RolesPage />
              </WidgetSuspense>
            </WidgetBoundary>
          </RequirePermission>
        }
      />
      <Route path="/admin/403" element={<ForbiddenPage />} />
      <Route
        path="/admin/settings"
        element={
          <WidgetBoundary title="Settings unavailable">
            <SettingsPage />
          </WidgetBoundary>
        }
      />
      <Route
        path="/admin/product"
        element={
          <RequirePermission perm="user:read:any">
            <WidgetBoundary title="Product console unavailable">
              <WidgetSuspense label="Loading product console">
                <ProductPage />
              </WidgetSuspense>
            </WidgetBoundary>
          </RequirePermission>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
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
          <Route path="/magic-login" element={<TokenActionPage kind="magic" onLoggedIn={onLoggedIn} />} />
          <Route path="/verify-email" element={<TokenActionPage kind="email" onLoggedIn={onLoggedIn} />} />
          <Route
            path="/restore-account"
            element={<TokenActionPage kind="restore" onLoggedIn={onLoggedIn} />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </RemoteErrorBoundary>
  );
}

function TokenActionPage({
  kind,
  onLoggedIn,
}: { kind: "magic" | "email" | "restore"; onLoggedIn(u: LoginResult): void }) {
  const navigate = useNavigate();
  const started = useRef(false);
  const [message, setMessage] = useState("Validating secure link…");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    const path =
      kind === "magic"
        ? "/auth/magic-link/consume"
        : kind === "email"
          ? "/users/email-change/verify"
          : "/users/deletion/restore";
    void secureRequest<LoginResult>(path, { method: "POST", body: JSON.stringify({ token }) })
      .then((data) => {
        if (kind === "magic") {
          onLoggedIn(data);
          return;
        }
        sessionStorage.setItem(
          "auth:notice",
          kind === "email" ? "Email address verified." : "Account restored. You can sign in again.",
        );
        navigate("/login", { replace: true });
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "This secure link is invalid or expired."),
      );
  }, [kind, navigate, onLoggedIn]);
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card>
        <output aria-live="polite">{message}</output>
      </Card>
    </main>
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
  const location = useLocation();
  const toast = useToast();
  const requestedPermission = (location.state as { requestedPermission?: string } | null)
    ?.requestedPermission;
  const requestAccess = async () => {
    try {
      await secureRequest("/users/product/records", {
        method: "POST",
        body: JSON.stringify({
          kind: "access_request",
          name: `Access request${requestedPermission ? `: ${requestedPermission}` : ""}`,
          status: "pending",
          payload: { permission: requestedPermission ?? "unspecified", requester: user?.email },
        }),
      });
      toast("success", "Access request sent to your administrator");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not send the access request");
    }
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
  const { locale } = useI18n();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-mono text-5xl font-extrabold tracking-tighter text-[var(--color-line)]">404</p>
      <h2 className="text-xl font-bold tracking-tight">
        {locale === "id" ? "Halaman tidak ditemukan" : "Page not found"}
      </h2>
      <p className="text-sm text-[var(--color-muted)]">
        {locale === "id"
          ? "Halaman yang Anda cari tidak tersedia."
          : "The page you are looking for does not exist."}
      </p>
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { timeZone, setTimeZone, soundEnabled, setSoundEnabled } = usePreferences();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [mfa, setMFA] = useState<{ secret: string; qrDataUrl: string }>();
  const [mfaCode, setMFACode] = useState("");
  const [mfaBusy, setMFABusy] = useState(false);
  const [profile, setProfile] = useState({ displayName: "", avatarUrl: "" });
  const [emailChange, setEmailChange] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [onboardingDone, setOnboardingDone] = useState(
    () => localStorage.getItem("user-onboarding-complete") === "1",
  );
  const [notifications, setNotifications] = useState<
    Array<{ id: number; name: string; status: string; payload: Record<string, unknown> }>
  >([]);
  const [loginHistory, setLoginHistory] = useState<
    Array<{
      id: number;
      success: boolean;
      riskScore: number;
      anomalous: boolean;
      ip: string;
      createdAt: string;
    }>
  >([]);
  const [sessions, setSessions] = useState<
    Array<{
      id: number;
      deviceId?: string;
      userAgent: string;
      ip: string;
      createdAt: string;
      current: boolean;
    }>
  >([]);
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

  useEffect(() => {
    void secureRequest("/auth/sessions")
      .then((data) => {
        const payload = data as { items?: typeof sessions } | undefined;
        setSessions(payload?.items ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void secureRequest<{ displayName?: string; avatarUrl?: string }>("/users/me")
      .then((data) => setProfile({ displayName: data.displayName ?? "", avatarUrl: data.avatarUrl ?? "" }))
      .catch(() => undefined);
    void secureRequest<{ items?: typeof loginHistory }>("/auth/login-history?limit=10")
      .then((data) => setLoginHistory(data.items ?? []))
      .catch(() => undefined);
    void secureRequest<{ items?: typeof notifications }>("/users/product/records?kind=notification")
      .then((data) => setNotifications(data.items ?? []))
      .catch(() => undefined);
  }, []);

  async function finishOnboarding() {
    try {
      await secureRequest("/users/product/records", {
        method: "POST",
        body: JSON.stringify({
          kind: "onboarding",
          name: "User onboarding",
          status: "complete",
          payload: { completedAt: new Date().toISOString() },
        }),
      });
      localStorage.setItem("user-onboarding-complete", "1");
      setOnboardingDone(true);
      toast("success", "Onboarding completed.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not save onboarding progress");
    }
  }

  async function readNotification(item: (typeof notifications)[number]) {
    try {
      await secureRequest(`/users/product/records/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "read", payload: item.payload }),
      });
      setNotifications((items) =>
        items.map((notification) =>
          notification.id === item.id ? { ...notification, status: "read" } : notification,
        ),
      );
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not update notification");
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    try {
      const updated = await secureRequest<typeof profile>(`/users/${user?.id}`, {
        method: "PATCH",
        body: JSON.stringify(profile),
      });
      setProfile(updated);
      toast("success", "Profile updated.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not update profile");
    }
  }

  async function requestEmailChange(event: FormEvent) {
    event.preventDefault();
    try {
      await secureRequest("/users/me/email-change", {
        method: "POST",
        body: JSON.stringify({ email: emailChange }),
      });
      setEmailChange("");
      toast("success", "Verification sent to the new address.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not request email change");
    }
  }

  async function generateRecoveryCodes() {
    try {
      const data = await secureRequest<{ codes?: string[] }>("/auth/recovery-codes", { method: "POST" });
      setRecoveryCodes(data.codes ?? []);
      toast("success", "New recovery codes generated. Existing codes are now invalid.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not generate recovery codes");
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordBusy(true);
    try {
      await secureRequest("/auth/password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      toast("success", "Password changed. Sign in again on every device.");
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not change password");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function beginMFA() {
    setMFABusy(true);
    try {
      setMFA((await secureRequest("/auth/mfa/enroll", { method: "POST" })) as typeof mfa);
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not start MFA enrollment");
    } finally {
      setMFABusy(false);
    }
  }

  async function verifyMFA(event: FormEvent) {
    event.preventDefault();
    setMFABusy(true);
    try {
      await secureRequest("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ code: mfaCode }) });
      setMFA(undefined);
      setMFACode("");
      toast("success", "Authenticator MFA enabled.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Invalid authenticator code");
    } finally {
      setMFABusy(false);
    }
  }

  async function revokeSession(id: number) {
    try {
      await secureRequest(`/auth/sessions/${id}`, { method: "DELETE" });
      setSessions((items) => items.filter((item) => item.id !== id));
      toast("success", "Session revoked.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not revoke session");
    }
  }

  async function exportData() {
    try {
      const data = await secureRequest("/users/me/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `platform-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast("success", "Your data export is ready.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not export your data");
    }
  }

  async function eraseAccount() {
    const approved = await confirm(
      "Schedule account deletion?",
      "This signs you out now and schedules erasure after a 30-day restoration period.",
      { danger: true, label: "Schedule deletion" },
    );
    if (!approved) return;
    try {
      await secureRequest("/users/me/deletion", { method: "POST" });
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not erase the account");
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-accent)]">System</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Your console preferences</h2>
      </div>
      {!onboardingDone ? (
        <Card title="Welcome checklist">
          <ol className="grid gap-3 text-sm sm:grid-cols-3">
            <li>
              <strong>1. Profile</strong>
              <br />
              Add your display name and avatar.
            </li>
            <li>
              <strong>2. Security</strong>
              <br />
              Review sessions and enable MFA.
            </li>
            <li>
              <strong>3. Preferences</strong>
              <br />
              Choose timezone and feedback.
            </li>
          </ol>
          <Button type="button" className="mt-4" onClick={() => void finishOnboarding()}>
            Finish onboarding
          </Button>
        </Card>
      ) : null}
      <Card title={`Notifications (${notifications.filter((item) => item.status !== "read").length} unread)`}>
        {notifications.length ? (
          <ul className="divide-y divide-[var(--color-line)]">
            {notifications.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                <span
                  className={
                    item.status === "read" ? "text-sm text-[var(--color-muted)]" : "text-sm font-semibold"
                  }
                >
                  {item.name}
                </span>
                {item.status !== "read" ? (
                  <Button type="button" variant="ghost" onClick={() => void readNotification(item)}>
                    Mark read
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">You are all caught up.</p>
        )}
      </Card>
      <Card title="Profile">
        <p id="profile" className="text-sm font-semibold">
          {user?.email}
        </p>
        <p className="mt-1 font-mono text-xs text-[var(--color-muted)]">
          claims v{user?.ver ?? 0} · {user?.perms.length ?? 0} permissions
        </p>
        <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <Input
              maxLength={120}
              value={profile.displayName}
              onChange={(event) => setProfile((item) => ({ ...item, displayName: event.target.value }))}
            />
          </Field>
          <Field label="Avatar HTTPS URL">
            <Input
              type="url"
              maxLength={400}
              value={profile.avatarUrl}
              onChange={(event) => setProfile((item) => ({ ...item, avatarUrl: event.target.value }))}
            />
          </Field>
          <Button className="sm:col-span-2 sm:w-fit">Save profile</Button>
        </form>
        <form
          onSubmit={requestEmailChange}
          className="mt-6 flex flex-col gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row sm:items-end"
        >
          <Field label="New verified email">
            <Input
              required
              type="email"
              maxLength={254}
              value={emailChange}
              onChange={(event) => setEmailChange(event.target.value)}
            />
          </Field>
          <Button>Send verification</Button>
        </form>
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
      <Card title="Password">
        <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password">
            <Input
              required
              type="password"
              autoComplete="current-password"
              maxLength={72}
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
            />
          </Field>
          <Field label="New password">
            <Input
              required
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <p className="text-xs text-[var(--color-muted)] sm:col-span-2">
            Use 12 or more characters and at least three of: lowercase, uppercase, number, symbol.
          </p>
          <Button disabled={passwordBusy} className="sm:col-span-2 sm:w-fit">
            {passwordBusy ? "Changing..." : "Change password"}
          </Button>
        </form>
      </Card>
      <WidgetBoundary title="MFA settings unavailable">
        <Card title="Authenticator MFA">
          {!mfa ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-xl text-sm text-[var(--color-muted)]">
                Add a time-based one-time password from your authenticator app to every login.
              </p>
              <Button type="button" disabled={mfaBusy} onClick={beginMFA}>
                {mfaBusy ? "Preparing..." : "Set up authenticator"}
              </Button>
            </div>
          ) : (
            <form onSubmit={verifyMFA} className="grid gap-5 sm:grid-cols-[256px_1fr]">
              <img
                src={mfa.qrDataUrl}
                width="256"
                height="256"
                alt="Authenticator enrollment QR code"
                className="rounded-xl border border-[var(--color-line)]"
              />
              <div className="space-y-4">
                <p className="text-sm text-[var(--color-muted)]">
                  Scan the QR code, or enter this secret manually: <code>{mfa.secret}</code>
                </p>
                <Field label="Six-digit code">
                  <Input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(event) => setMFACode(event.target.value.replace(/\D/g, ""))}
                  />
                </Field>
                <Button disabled={mfaBusy || mfaCode.length !== 6}>
                  {mfaBusy ? "Verifying..." : "Enable MFA"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </WidgetBoundary>
      <Card title="Recovery codes">
        <p className="text-sm text-[var(--color-muted)]">
          Each code signs in once when your authenticator is unavailable.
        </p>
        <Button type="button" className="mt-4" onClick={generateRecoveryCodes}>
          Generate replacement codes
        </Button>
        {recoveryCodes.length ? (
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--color-line)] p-4 font-mono text-xs">
            {recoveryCodes.join("\n")}
          </pre>
        ) : null}
      </Card>
      <WidgetBoundary title="Session list unavailable">
        <Card title="Active sessions">
          {sessions.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No active session details are available.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {session.current ? "This device" : session.deviceId || "Unknown device"}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted)]">
                      {session.ip} · {session.userAgent || "Unknown browser"}
                    </p>
                  </div>
                  {!session.current ? (
                    <Button type="button" variant="danger" onClick={() => revokeSession(session.id)}>
                      Revoke
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </WidgetBoundary>
      <Card title="Recent sign-ins">
        <ul className="divide-y divide-[var(--color-line)]">
          {loginHistory.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span>
                {event.success ? "Successful sign-in" : "Rejected sign-in"} · {event.ip || "unknown network"}
              </span>
              <span className={event.anomalous ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"}>
                risk {event.riskScore} · {new Date(event.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Data & privacy">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-[var(--color-muted)]">
            Download the profile, session, role, and audit data linked to your account, or schedule erasure
            with a 30-day recovery window.
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={exportData}>
              Export my data
            </Button>
            <Button type="button" variant="danger" onClick={eraseAccount}>
              Schedule deletion
            </Button>
          </div>
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
  const isAuthPath = [
    "/login",
    "/register",
    "/forgot",
    "/reset",
    "/magic-login",
    "/verify-email",
    "/restore-account",
  ].includes(pathname);

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
      <I18nProvider defaultLocale="id">
        <ToastProvider>
          <ConfirmProvider>
            <DrawerProvider>
              <AuthProvider>
                <BrowserRouter>
                  <a
                    href="#main-content"
                    className="fixed left-3 top-3 z-[var(--z-skip)] -translate-y-20 rounded-lg bg-[var(--color-ink)] px-3 py-2 text-sm font-semibold text-[var(--color-canvas)] transition-transform focus:translate-y-0"
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
      </I18nProvider>
    </QueryClientProvider>
  );
}
