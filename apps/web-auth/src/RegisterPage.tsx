import { Card } from "@starter/ui";
import { type FormEvent, useMemo, useState } from "react";
import AuthFrame from "./AuthFrame";
import { register } from "./api";
import {
  AuthInput,
  ErrorSummary,
  PasswordInput,
  SubmitButton,
  SuccessPanel,
  authNavigate,
  normalizeEmail,
  useEmailDraft,
  validEmail,
  validPassword,
} from "./auth-ui";

export default function RegisterPage() {
  const draft = useEmailDraft("auth:register-email");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const emailValid = validEmail(draft.email);
  const strongEnough = validPassword(password);
  const matches = Boolean(confirm) && confirm === password;

  const errors = useMemo(() => {
    const items: Array<{ field: string; message: string }> = [];
    if (touched && !emailValid)
      items.push({ field: "register-email", message: "Enter a valid email address" });
    if (touched && !strongEnough)
      items.push({ field: "register-password", message: "Choose a stronger password" });
    if (touched && !matches) items.push({ field: "register-confirm", message: "Passwords must match" });
    if (error) items.push({ field: "register-email", message: error });
    return items;
  }, [emailValid, error, matches, strongEnough, touched]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    draft.normalize();
    if (!emailValid || !strongEnough || !matches) return;
    setBusy(true);
    setError("");
    try {
      const email = normalizeEmail(draft.email);
      await register(email, password);
      sessionStorage.setItem("auth:login-email", email);
      setRegisteredEmail(email);
      draft.clear();
      setDone(true);
    } catch (caught) {
      setError((caught as Error).message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame page="register">
      <p className="mb-5 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">New here</p>
      <h1 className="max-w-5xl text-[clamp(2.5rem,4.6vw,5rem)] font-extrabold leading-[1.02] tracking-tight">
        Claim your seat.
      </h1>
      <div className="mt-10 max-w-md sm:mt-12">
        <Card>
          {done ? (
            <SuccessPanel title="Account created" message="Your email is ready on the login screen.">
              <a
                href={`/login?email=${encodeURIComponent(registeredEmail)}`}
                onClick={(event) =>
                  authNavigate(event, `/login?email=${encodeURIComponent(registeredEmail)}`)
                }
                className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)] underline underline-offset-4"
              >
                Continue to login →
              </a>
            </SuccessPanel>
          ) : (
            <form
              onSubmit={submit}
              className={`ui-auth-form space-y-4 ${error ? "animate-auth-shake" : ""}`}
              noValidate
            >
              <ErrorSummary errors={errors} />
              <AuthInput
                id="register-email"
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
                id="register-password"
                label="Password"
                value={password}
                autoComplete="new-password"
                onChange={setPassword}
                withStrength
                error={
                  touched && !strongEnough
                    ? "Use 12+ characters from at least three character classes"
                    : undefined
                }
                valid={touched && strongEnough}
              />
              <PasswordInput
                id="register-confirm"
                label="Confirm password"
                value={confirm}
                autoComplete="new-password"
                onChange={setConfirm}
                error={touched && !matches ? "Passwords do not match" : undefined}
                valid={touched && matches}
              />
              <div className="ui-auth-sticky-actions pt-1">
                <SubmitButton busy={busy} disabled={!emailValid || !strongEnough || !matches}>
                  Create account
                </SubmitButton>
              </div>
            </form>
          )}
        </Card>
        <p className="mt-5 text-sm text-[var(--color-muted)]">
          Already registered?{" "}
          <a
            href="/login"
            onClick={(event) => authNavigate(event, "/login")}
            className="text-[var(--color-ink)] underline-offset-4 hover:underline"
          >
            Back to login
          </a>
        </p>
      </div>
    </AuthFrame>
  );
}
