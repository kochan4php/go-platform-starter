import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";

export {
  ConfirmProvider,
  DrawerProvider,
  PreferencesProvider,
  ScrollToTop,
  ToastProvider,
  useConfirm,
  useCopy,
  useDrawer,
  useOnline,
  usePageVisible,
  usePreferences,
  useStored,
  useToast,
  formatNumber,
  formatDateTime,
  relativeTime,
  type ConfirmFn,
  type ToastApi,
  type UserPreferences,
} from "./ui-system";

type Variant = "primary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "bg-[var(--color-ink)] text-[var(--color-canvas)] hover:opacity-88 disabled:opacity-40",
  ghost:
    "border border-[var(--color-line)] bg-transparent text-[var(--color-ink)] hover:border-[var(--color-ink)]/30 hover:bg-[var(--color-hover)] disabled:opacity-40",
  danger:
    "border border-[var(--color-danger)]/25 bg-transparent text-[var(--color-danger)] hover:border-[var(--color-danger)]/60 hover:bg-[var(--color-danger)]/10 disabled:opacity-40",
};

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/60 ${variantClass[variant]} ${className}`}
    />
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`ui-input ${className}`} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control arrives as a child at runtime (implicit association)
    <label className="block">
      <span className="ui-label block">{label}</span>
      {children}
    </label>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="ui-card p-6">
      {title ? <h1 className="mb-5 text-lg font-bold tracking-tight">{title}</h1> : null}
      {children}
    </section>
  );
}

export function Alert({ kind = "error", message }: { kind?: "error" | "info"; message: string }) {
  const cls =
    kind === "error"
      ? "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
      : "border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]";
  return (
    <p role="alert" className={`rounded-xl border px-4 py-2.5 text-sm ${cls}`}>
      {message}
    </p>
  );
}

export function Spinner() {
  return (
    <span
      aria-label="loading"
      className="inline-block size-4 animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-accent)]"
    />
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <td className={`border-t border-[var(--color-line)] px-4 py-3.5 align-middle ${className}`}>
      {children}
    </td>
  );
}

export function Modal({
  title,
  eyebrow,
  description,
  size = "md",
  onClose,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  onClose(): void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onClose]);

  const width = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-lg";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ui-modal-backdrop ui-modal-root"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <dialog
        open
        ref={panelRef}
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        className={`ui-modal-panel ${width}`}
      >
        <div className="ui-modal-header">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-accent)]">
                {eyebrow}
              </p>
            ) : null}
            <h2 id={titleId} className="text-xl font-bold tracking-[-0.025em] text-[var(--color-ink)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-[var(--color-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="ui-modal-close">
            ×
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
      </dialog>
    </div>,
    document.body,
  );
}

export function ModalSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="ui-modal-section">
      <div className="mb-4">
        <h3 className="ui-modal-section-title">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return <footer className="ui-modal-actions">{children}</footer>;
}

/* ---- dashboard composites ---- */

export function Badge({
  children,
  tone = "neutral",
}: { children: ReactNode; tone?: "neutral" | "accent" | "danger" }) {
  const tones = {
    neutral: "border-[var(--color-line)] text-[var(--color-muted)]",
    accent: "border-[var(--color-accent)]/40 text-[var(--color-accent)]",
    danger: "border-[var(--color-danger)]/40 text-[var(--color-danger)]",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Avatar({
  seed,
  alt = "",
  label,
}: {
  seed: string | number;
  alt?: string;
  label?: string;
}) {
  const text = label?.trim() || String(seed);
  const hue = [...String(seed)].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 360, 0);
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={!alt || undefined}
      style={{ backgroundColor: `hsl(${hue} 42% 84%)`, color: `hsl(${hue} 52% 24%)` }}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase transition-transform hover:z-20 hover:scale-150"
    >
      {text.charAt(0) || "?"}
    </span>
  );
}

/** Big numeral for bento stats; value is data-driven, never invented. */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex h-full flex-col justify-between gap-6 p-6 transition-colors hover:bg-[var(--color-hover)]">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</p>
      <div>
        <p className="font-mono text-5xl font-medium tabular-nums tracking-tighter">{value}</p>
        {hint ? <p className="mt-2 text-sm text-[var(--color-muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

/* ---- cross-surface identity ---- */

export function BrandMark({
  href = "/",
  collapsed = false,
  tooltip = "",
  busy = false,
}: {
  href?: string;
  collapsed?: boolean;
  tooltip?: string;
  busy?: boolean;
}) {
  if (collapsed) {
    return (
      <a
        href={href}
        title={tooltip || "Platform Console"}
        className="flex items-center gap-2 font-bold tracking-tight"
      >
        <span
          className={`block size-2.5 rounded-full bg-[var(--color-accent)] shadow-[0_0_12px_var(--color-accent)]/40 ${busy ? "animate-brand-dot" : ""}`}
        />
      </a>
    );
  }
  return (
    <a href={href} className="flex items-center gap-2 font-bold tracking-tight">
      <span
        className={`block size-2 rounded-full bg-[var(--color-accent)] ${busy ? "animate-brand-dot" : ""}`}
      />
      Platform Console
    </a>
  );
}

export function FooterStrip() {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">
      go-platform-starter · spec-first · schema-per-service
    </p>
  );
}

/* ---- shared shell primitives (D-class) ---- */

export function SkeletonLine({ w = "w-full" }: { w?: string }) {
  return <div className={`ui-skeleton rounded-md bg-[var(--color-skeleton)] ${w}`}>&nbsp;</div>;
}

export function SkeletonBlock({ h = "h-24" }: { h?: string }) {
  return (
    <div className={`ui-skeleton rounded-[var(--radius-card)] bg-[var(--color-skeleton)] ${h}`}>&nbsp;</div>
  );
}

/**
 * Accessible tooltip wrapper. Hover/focus surfaces a label; `kbd` renders a
 * shortcut hint to the right (e.g. "?" → "?  ⌘K").
 */
export function Tooltip({
  label,
  kbd,
  children,
  side = "top",
}: {
  label: string;
  kbd?: string;
  children: ReactNode;
  side?: "top" | "bottom" | "right";
}) {
  const placement =
    side === "top"
      ? "bottom-full left-1/2 mb-1.5 -translate-x-1/2"
      : side === "bottom"
        ? "top-full left-1/2 mt-1.5 -translate-x-1/2"
        : "left-full top-1/2 ml-1.5 -translate-y-1/2";
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${placement}`}
      >
        {label}
        {kbd ? <span className="ml-1.5 text-[var(--color-muted)]">{kbd}</span> : null}
      </span>
    </span>
  );
}

/** Pill that truncates long text but expands the full value on click. */
export function ExpandableText({
  text: value,
  max = 32,
}: {
  text: string;
  max?: number;
}) {
  if (value.length <= max) return <span>{value}</span>;
  return (
    <details className="group relative inline-block max-w-full">
      <summary className="inline cursor-pointer list-none">
        <span className="underline decoration-dotted decoration-[var(--color-muted)] underline-offset-4">
          {value.slice(0, max)}…
        </span>
      </summary>
      <span className="absolute left-0 top-full z-30 mt-1 block min-w-48 max-w-md break-words rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-2 font-mono text-[11px] shadow-xl">
        {value}
      </span>
    </details>
  );
}
