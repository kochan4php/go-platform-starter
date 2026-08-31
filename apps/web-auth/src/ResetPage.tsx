import { resetPasswordSchema, validateResetTokenSchema } from "@starter/contracts/schemas";
import { Card, SkeletonBlock, SkeletonLine } from "@starter/ui";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import AuthFrame from "./AuthFrame";
import { type AuthApiError, reset, validateReset } from "./api";
import {
  ErrorSummary,
  PasswordInput,
  SubmitButton,
  SuccessPanel,
  authNavigate,
  validPassword,
} from "./auth-ui";

export default function ResetPage() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const email = new URLSearchParams(window.location.search).get("email") ?? "";
  const [tokenState, setTokenState] = useState<"checking" | "valid" | "invalid">("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const [redirectIn, setRedirectIn] = useState(3);
  const strongEnough =
    resetPasswordSchema.shape.newPassword.safeParse(newPassword).success && validPassword(newPassword);
  const matches = Boolean(confirm) && confirm === newPassword;

  useEffect(() => {
    let active = true;
    if (!validateResetTokenSchema.safeParse({ token }).success) {
      setTokenState("invalid");
      return;
    }
    validateReset(token)
      .then(() => active && setTokenState("valid"))
      .catch(() => active && setTokenState("invalid"));
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!done) return;
    const timer = setInterval(() => setRedirectIn((seconds) => Math.max(0, seconds - 1)), 1000);
    const redirect = setTimeout(() => {
      sessionStorage.setItem("auth:notice", "Password updated. Log in with your new password.");
      window.location.assign(`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`);
    }, 3000);
    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, [done, email]);

  const errors = useMemo(() => {
    const items: Array<{ field: string; message: string }> = [];
    if (touched && !strongEnough)
      items.push({ field: "reset-password", message: "Choose a stronger password" });
    if (touched && !matches) items.push({ field: "reset-confirm", message: "Passwords must match" });
    if (error) items.push({ field: "reset-password", message: error });
    return items;
  }, [error, matches, strongEnough, touched]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!resetPasswordSchema.safeParse({ token, newPassword }).success || !strongEnough || !matches) return;
    setBusy(true);
    setError("");
    try {
      await reset(token, newPassword);
      setDone(true);
    } catch (caught) {
      const apiError = caught as AuthApiError;
      const message = apiError.message || "Reset failed";
      setError(message);
      if (apiError.status === 400 || /token|expired/i.test(message)) setTokenState("invalid");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame page="reset">
      <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">
        One last step
      </p>
      <h1 className="max-w-5xl text-[clamp(2.5rem,4.6vw,5rem)] font-extrabold leading-[1.02] tracking-tight">
        Set it once,
        <br />
        remember it twice.
      </h1>
      <div className="mt-10 max-w-md sm:mt-12">
        <Card>
          {tokenState === "checking" ? (
            <output aria-live="polite" aria-label="Validating reset link" className="block space-y-4 py-2">
              <SkeletonLine w="w-2/3" />
              <SkeletonBlock h="h-12" />
              <SkeletonBlock h="h-12" />
            </output>
          ) : tokenState === "invalid" ? (
            <div className="py-3 text-center" role="alert">
              <span
                className="mx-auto grid size-14 place-items-center rounded-full border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-2xl font-bold text-[var(--color-danger)]"
                aria-hidden
              >
                !
              </span>
              <h2 className="mt-4 text-xl font-bold">This reset link is not valid</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                It may have expired or already been used. Request a fresh, single-use link.
              </p>
              <a
                href="/forgot"
                onClick={(event) => authNavigate(event, "/forgot")}
                className="mt-5 inline-flex min-h-11 items-center font-semibold text-[var(--color-accent)] underline underline-offset-4"
              >
                Request another link →
              </a>
            </div>
          ) : done ? (
            <SuccessPanel
              title="Password updated"
              message={`All existing sessions were signed out. Redirecting to login in ${redirectIn}s.`}
            />
          ) : (
            <form
              onSubmit={submit}
              className={`ui-auth-form space-y-4 ${error ? "animate-auth-shake" : ""}`}
              noValidate
            >
              <ErrorSummary errors={errors} />
              <PasswordInput
                id="reset-password"
                label="New password"
                value={newPassword}
                autoComplete="new-password"
                onChange={setNewPassword}
                withStrength
                error={
                  touched && !strongEnough
                    ? "Use 12+ characters from at least three character classes"
                    : undefined
                }
                valid={touched && strongEnough}
              />
              <PasswordInput
                id="reset-confirm"
                label="Confirm password"
                value={confirm}
                autoComplete="new-password"
                onChange={setConfirm}
                error={touched && !matches ? "Passwords do not match" : undefined}
                valid={touched && matches}
              />
              <div className="ui-auth-sticky-actions pt-1">
                <SubmitButton busy={busy} disabled={!strongEnough || !matches}>
                  Set new password
                </SubmitButton>
              </div>
            </form>
          )}
        </Card>
        <p className="mt-5 text-sm text-[var(--color-muted)]">
          <a
            href="/login"
            onClick={(event) => authNavigate(event, "/login")}
            className="inline-flex min-h-11 items-center text-[var(--color-ink)] underline-offset-4 hover:underline"
          >
            Back to login
          </a>
        </p>
      </div>
    </AuthFrame>
  );
}
