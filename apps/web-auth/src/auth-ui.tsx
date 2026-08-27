import { Button, Spinner } from "@starter/ui";
import { type InputHTMLAttributes, type MouseEvent, type ReactNode, useId, useState } from "react";

export const EMAIL_MAX = 254;
export const PASSWORD_MAX = 72;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function passwordStrength(value: string) {
  if (!value) return 0;
  return [
    value.length >= 8,
    value.length >= 12,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^\w\s]/.test(value),
  ].filter(Boolean).length;
}

export function useEmailDraft(key: string) {
  const params = new URLSearchParams(window.location.search);
  const initial = params.get("email") ?? sessionStorage.getItem(key) ?? "";
  const [email, setEmailState] = useState(() => normalizeEmail(initial));
  const setEmail = (value: string) => {
    setEmailState(value);
    sessionStorage.setItem(key, value);
  };
  const normalize = () => setEmail(normalizeEmail(email));
  const clear = () => sessionStorage.removeItem(key);
  return { email, setEmail, normalize, clear };
}

export function AuthInput({
  label,
  icon,
  helper,
  error,
  valid = false,
  showCount = true,
  onBlur,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: "email" | "password" | "token";
  helper?: ReactNode;
  error?: string;
  valid?: boolean;
  showCount?: boolean;
}) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const length = String(props.value ?? "").length;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="ui-auth-field relative block">
        <span className="ui-auth-icon" aria-hidden>
          <InputIcon kind={icon} />
        </span>
        <input
          {...props}
          id={id}
          aria-label={props["aria-label"] ?? label}
          placeholder={props.placeholder ?? " "}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [helper ? helpId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined
          }
          onBlur={onBlur}
          className={`ui-input ui-auth-input peer ${error ? "ui-input-error" : valid ? "ui-input-valid" : ""}`}
        />
        <span className="ui-auth-floating-label">{label}</span>
        {error || valid ? (
          <span
            className={`ui-auth-state ${error ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}
            aria-hidden
          >
            {error ? "!" : "✓"}
          </span>
        ) : null}
      </label>
      <div className="flex min-h-4 items-start justify-between gap-3 px-1 text-xs">
        <span
          id={error ? errorId : helpId}
          className={error ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"}
        >
          {error ?? helper}
        </span>
        {showCount && props.maxLength ? (
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--color-muted)]">
            {length}/{props.maxLength}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function PasswordInput({
  id,
  label,
  value,
  error,
  valid,
  autoComplete,
  onChange,
  withStrength = false,
}: {
  id?: string;
  label: string;
  value: string;
  error?: string;
  valid?: boolean;
  autoComplete: string;
  onChange(value: string): void;
  withStrength?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const strength = passwordStrength(value);
  return (
    <div>
      <div className="ui-auth-password-field relative">
        <AuthInput
          id={id}
          label={label}
          icon="password"
          type={visible ? "text" : "password"}
          name={label.toLowerCase().replaceAll(" ", "-")}
          autoComplete={autoComplete}
          value={value}
          maxLength={PASSWORD_MAX}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => setCaps(event.getModifierState("CapsLock"))}
          onKeyUp={(event) => setCaps(event.getModifierState("CapsLock"))}
          onBlur={() => setCaps(false)}
          error={error}
          valid={valid}
          helper={
            caps ? (
              <span className="text-[var(--color-warning)]">Caps Lock is on</span>
            ) : (
              "Paste is allowed and never blocked."
            )
          }
        />
        <button
          type="button"
          className="ui-auth-password-toggle"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          <EyeIcon crossed={visible} />
        </button>
      </div>
      {withStrength ? <StrengthMeter value={strength} /> : null}
    </div>
  );
}

export function StrengthMeter({ value }: { value: number }) {
  const labels = ["Add a password", "Very weak", "Weak", "Fair", "Strong", "Excellent"];
  return (
    <div className="mt-1 px-1" aria-live="polite">
      <div className="grid grid-cols-5 gap-1" aria-hidden>
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            className={`h-1 rounded-full ${step <= value ? (value >= 4 ? "bg-[var(--color-success)]" : "bg-[var(--color-warning)]") : "bg-[var(--color-line)]"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Strength: <strong className="text-[var(--color-ink)]">{labels[value]}</strong>. Use 12+ characters
        with mixed case, a number, and a symbol.
      </p>
    </div>
  );
}

export function SubmitButton({
  busy,
  children,
  disabled = false,
}: { busy: boolean; children: ReactNode; disabled?: boolean }) {
  return (
    <Button type="submit" disabled={busy || disabled} className="min-h-11 min-w-32">
      {busy ? <Spinner /> : null}
      <span>{busy ? "Please wait" : children}</span>
      {!busy ? <span aria-hidden>→</span> : null}
    </Button>
  );
}

export function ErrorSummary({ errors }: { errors: Array<{ field: string; message: string }> }) {
  if (!errors.length) return null;
  return (
    <div role="alert" aria-live="assertive" className="ui-auth-error-summary">
      <p className="font-semibold">Please fix the following:</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {errors.map((item) => (
          <li key={item.field}>
            <a href={`#${item.field}`} className="underline underline-offset-2">
              {item.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SuccessPanel({
  title,
  message,
  children,
}: { title: string; message: string; children?: ReactNode }) {
  return (
    <div className="py-3 text-center" aria-live="polite">
      <span className="ui-auth-success-check" aria-hidden>
        <svg viewBox="0 0 52 52">
          <title>Success</title>
          <path d="m14 27 8 8 17-19" />
        </svg>
      </span>
      <h2 className="mt-4 text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{message}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

export function authNavigate(event: MouseEvent<HTMLAnchorElement>, to: string) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  const navigate = () => {
    history.pushState(null, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  if (document.startViewTransition) document.startViewTransition(navigate);
  else navigate();
}

function InputIcon({ kind }: { kind: "email" | "password" | "token" }) {
  if (kind === "email")
    return (
      // biome-ignore lint/a11y/noSvgWithoutTitle: decorative; the field label supplies the name
      <svg viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  if (kind === "token")
    return (
      // biome-ignore lint/a11y/noSvgWithoutTitle: decorative; the field label supplies the name
      <svg viewBox="0 0 24 24">
        <circle cx="8" cy="12" r="4" />
        <path d="M12 12h9M18 12v3M15 12v2" />
      </svg>
    );
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative; the field label supplies the name
    <svg viewBox="0 0 24 24">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
    </svg>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <title>Password visibility</title>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
      {crossed ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}
