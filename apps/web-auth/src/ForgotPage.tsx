import { forgotPasswordSchema } from "@starter/contracts/schemas";
import { Button, Card, Spinner } from "@starter/ui";
import { type FormEvent, useEffect, useState } from "react";
import AuthFrame from "./AuthFrame";
import { type AuthApiError, forgot } from "./api";
import {
  AuthInput,
  ErrorSummary,
  SubmitButton,
  SuccessPanel,
  authNavigate,
  normalizeEmail,
  useEmailDraft,
} from "./auth-ui";

const RESEND_SECONDS = 30;

export default function ForgotPage() {
  const draft = useEmailDraft("auth:forgot-email");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const emailValid = forgotPasswordSchema.shape.email.safeParse(normalizeEmail(draft.email)).success;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function send() {
    setBusy(true);
    setError("");
    try {
      await forgot(normalizeEmail(draft.email));
      setSent(true);
      setCooldown(RESEND_SECONDS);
    } catch (caught) {
      const apiError = caught as AuthApiError;
      setError(apiError.message || "Could not send the reset link");
      if (apiError.status === 429 && apiError.retryAfter > 0) setCooldown(apiError.retryAfter);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    draft.normalize();
    if (!emailValid) return;
    await send();
  }

  return (
    <AuthFrame page="forgot">
      <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">
        Recover access
      </p>
      <h1 className="max-w-5xl text-[clamp(2.5rem,4.6vw,5rem)] font-extrabold leading-[1.02] tracking-tight">
        Locked out?
        <br />
        Happens to everyone.
      </h1>
      <div className="mt-10 max-w-md sm:mt-12">
        <Card>
          {sent ? (
            <SuccessPanel
              title="Check your inbox"
              message="If that address exists, a reset link is on its way. This response is intentionally private."
            >
              <Button
                type="button"
                variant="ghost"
                disabled={busy || cooldown > 0}
                onClick={send}
                className="min-h-11"
              >
                {busy ? <Spinner /> : null}
                {cooldown > 0 ? `Send again in ${cooldown}s` : "Send again"}
              </Button>
              <p className="mt-3 font-mono text-[10px] text-[var(--color-muted)]">
                Sent to {normalizeEmail(draft.email)}
              </p>
            </SuccessPanel>
          ) : (
            <form
              onSubmit={submit}
              className={`ui-auth-form space-y-4 ${error ? "animate-auth-shake" : ""}`}
              noValidate
            >
              <ErrorSummary
                errors={[
                  ...(touched && !emailValid
                    ? [{ field: "forgot-email", message: "Enter a valid email address" }]
                    : []),
                  ...(error ? [{ field: "forgot-email", message: error }] : []),
                ]}
              />
              <AuthInput
                id="forgot-email"
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
              <div className="ui-auth-sticky-actions pt-1">
                <SubmitButton busy={busy} disabled={!emailValid}>
                  Send reset link
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
