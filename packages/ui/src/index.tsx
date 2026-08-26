import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "bg-[var(--color-ink)] text-[#09090b] hover:bg-[var(--color-accent)] disabled:opacity-40",
  ghost:
    "border border-[var(--color-line)] bg-transparent text-[var(--color-ink)] hover:border-[var(--color-ink)]/30 hover:bg-white/5 disabled:opacity-40",
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight cursor-pointer transition-all duration-300 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/60 ${variantClass[variant]} ${className}`}
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

export function Td({ children }: { children?: ReactNode }) {
  return <td className="border-t border-[var(--color-line)] px-4 py-3.5 align-middle">{children}</td>;
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose(): void;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: role=dialog + aria-label until native <dialog> fits the baseline
    <div
      role="dialog"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-xl leading-none text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
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

export function Avatar({ seed, alt = "" }: { seed: string | number; alt?: string }) {
  return (
    <img
      src={`https://picsum.photos/seed/${encodeURIComponent(seed)}/80/80`}
      alt={alt}
      loading="lazy"
      className="size-8 shrink-0 rounded-full object-cover grayscale contrast-110"
    />
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
    <div className="flex h-full flex-col justify-between gap-6 p-6 transition-colors hover:bg-white/[0.02]">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</p>
      <div>
        <p className="font-mono text-5xl font-medium tabular-nums tracking-tighter">{value}</p>
        {hint ? <p className="mt-2 text-sm text-[var(--color-muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}

/* ---- cross-surface identity ---- */

export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <a href={href} className="flex items-center gap-3 font-bold tracking-tight">
      <span className="block size-2 rounded-full bg-[var(--color-accent)]" />
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
