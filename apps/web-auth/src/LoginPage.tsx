import { Alert, Card } from "@starter/ui";
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import AuthFrame from "./AuthFrame";
import { type AuthApiError, login } from "./api";
import {
  AuthInput,
  ErrorSummary,
  PasswordInput,
  SubmitButton,
  authNavigate,
  normalizeEmail,
  useEmailDraft,
  validEmail,
} from "./auth-ui";

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;

export interface SessionPayload {
  accessToken: string;
  user: { id: number; email: string; perms?: string[]; ver?: number };
}

export default function LoginPage({
  onLoggedIn,
  mode = "page",
  onCancel,
}: {
  onLoggedIn(u: SessionPayload): void;
  mode?: "page" | "reauth";
  onCancel?(): void;
}) {
  const draft = useEmailDraft("auth:login-email");
  const [password, setPassword] = useState("");
  const [otp, setOTP] = useState("");
  const [mfaRequired, setMFARequired] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [attempts, setAttempts] = useState(MAX_ATTEMPTS);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [notice] = useState(() => {
    const message = sessionStorage.getItem("auth:notice") ?? "";
    sessionStorage.removeItem("auth:notice");
    return message;
  });
  const emailValid = validEmail(draft.email);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setTimeout(() => setLockSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [lockSeconds]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(
      () =>
        window.dispatchEvent(
          new CustomEvent("starter:toast-request", { detail: { kind: "success", message: notice } }),
        ),
      0,
    );
    return () => clearTimeout(timer);
  }, [notice]);

  const validationErrors = useMemo(() => {
    const items: Array<{ field: string; message: string }> = [];
    if (touched && !emailValid) items.push({ field: "login-email", message: "Enter a valid email address" });
    if (touched && !password) items.push({ field: "login-password", message: "Enter your password" });
    if (error) items.push({ field: "login-email", message: error });
    return items;
  }, [emailValid, error, password, touched]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    draft.normalize();
    if (!emailValid || !password || lockSeconds > 0) return;
    setBusy(true);
    setError("");
    try {
      const result = mfaRequired
        ? await login(normalizeEmail(draft.email), password, otp)
        : await login(normalizeEmail(draft.email), password);
      draft.clear();
      setAttempts(MAX_ATTEMPTS);
      onLoggedIn({
        accessToken: result.accessToken,
        user: { ...result.user, ...claimsOf(result.accessToken) },
      });
    } catch (caught) {
      const apiError = caught as AuthApiError;
      if (apiError.message === "mfa_required") {
        setMFARequired(true);
        setError("Enter the six-digit code from your authenticator app.");
        return;
      }
      const remaining = apiError.status === 401 ? Math.max(0, attempts - 1) : attempts;
      setAttempts(remaining);
      setError(apiError.message || "Invalid credentials or request");
      if (apiError.status === 429 && apiError.retryAfter > 0) setLockSeconds(apiError.retryAfter);
      else if (remaining === 0) setLockSeconds(LOCK_SECONDS);
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <Card>
      <form
        onSubmit={submit}
        className={`ui-auth-form space-y-4 ${error ? "animate-auth-shake" : ""}`}
        noValidate
      >
        <ErrorSummary errors={validationErrors} />
        {notice ? <Alert kind="info" message={notice} /> : null}
        <AuthInput
          id="login-email"
          label="Email"
          icon="email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={draft.email}
          maxLength={254}
          placeholder="name@company.com"
          onChange={(event) => draft.setEmail(event.target.value)}
          onBlur={() => {
            setTouched(true);
            draft.normalize();
          }}
          error={touched && !emailValid ? "Use an address like name@company.com" : undefined}
          valid={touched && emailValid}
        />
        <PasswordInput
          id="login-password"
          label="Password"
          value={password}
          autoComplete="current-password"
          onChange={setPassword}
          error={touched && !password ? "Password is required" : undefined}
        />
        {mfaRequired ? (
          <AuthInput
            id="login-otp"
            label="Authenticator code"
            icon="token"
            type="text"
            name="one-time-code"
            autoComplete="one-time-code"
            inputMode="numeric"
            value={otp}
            maxLength={6}
            placeholder="123456"
            onChange={(event) => setOTP(event.target.value.replace(/\D/g, "").slice(0, 6))}
            error={touched && otp.length !== 6 ? "Enter all six digits" : undefined}
            valid={otp.length === 6}
          />
        ) : null}
        {error ? <Alert message={error} /> : null}
        {lockSeconds > 0 ? (
          <output aria-live="polite" className="block text-sm text-[var(--color-warning)]">
            Try again in {formatCountdown(lockSeconds)}.
          </output>
        ) : error ? (
          <output className="block text-xs text-[var(--color-muted)]">
            {attempts} {attempts === 1 ? "attempt" : "attempts"} remaining before a temporary lock.
          </output>
        ) : null}
        <div className="ui-auth-sticky-actions flex items-center justify-between gap-4 pt-1">
          <SubmitButton
            busy={busy}
            disabled={!emailValid || !password || (mfaRequired && otp.length !== 6) || lockSeconds > 0}
          >
            {mode === "reauth" ? "Continue" : "Log in"}
          </SubmitButton>
          {mode === "page" ? (
            <a
              href="/forgot"
              onClick={(event) => authNavigate(event, "/forgot")}
              className="min-h-11 content-center text-sm text-[var(--color-muted)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
            >
              Forgot password
            </a>
          ) : null}
        </div>
      </form>
    </Card>
  );

  if (mode === "reauth") return <ReauthDialog onCancel={onCancel}>{form}</ReauthDialog>;

  return (
    <AuthFrame page="login">
      <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">
        Welcome back
      </p>
      <h1 className="max-w-5xl text-[clamp(2.5rem,4.6vw,5rem)] font-extrabold leading-[1.02] tracking-tight">
        Run the whole platform
        <br />
        from one quiet room.
      </h1>
      <div className="mt-10 max-w-md sm:mt-12">
        {form}
        <p className="mt-5 text-sm text-[var(--color-muted)]">
          No account?{" "}
          <a
            href="/register"
            onClick={(event) => authNavigate(event, "/register")}
            className="min-h-11 text-[var(--color-ink)] underline-offset-4 hover:underline"
          >
            Register
          </a>
        </p>
      </div>
    </AuthFrame>
  );
}

function ReauthDialog({ children, onCancel }: { children: ReactNode; onCancel?(): void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="reauth-title"
      onCancel={(event) => event.preventDefault()}
      className="ui-modal-panel ui-reauth-dialog max-w-sm"
    >
      <header className="ui-modal-header">
        <div>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Re-authentication required
          </p>
          <h2 id="reauth-title" className="text-xl font-bold tracking-tight text-[var(--color-ink)]">
            Your session expired
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Log in again to continue where you left off.
          </p>
        </div>
      </header>
      <div className="ui-modal-body">
        {children}
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 min-h-11 text-sm text-[var(--color-muted)] underline underline-offset-4"
        >
          Log out instead
        </button>
      </div>
    </dialog>
  );
}

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function claimsOf(jwt: string): { perms: string[]; ver: number } {
  const parts = jwt.split(".");
  if (parts.length < 2) return { perms: [], ver: 0 };
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      perms?: string[];
      ver?: number;
    };
    return { perms: payload.perms ?? [], ver: payload.ver ?? 0 };
  } catch {
    return { perms: [], ver: 0 };
  }
}
