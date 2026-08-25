import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-strong)] disabled:opacity-50",
  secondary:
    "border border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-neutral-50 disabled:opacity-50",
  danger: "border border-red-200 bg-white text-[var(--color-danger)] hover:bg-red-50 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${variantClass[variant]} ${className}`}
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
    <section className="ui-card">
      {title ? <h1 className="mb-4 text-lg font-semibold">{title}</h1> : null}
      {children}
    </section>
  );
}

export function Alert({ kind = "error", message }: { kind?: "error" | "info"; message: string }) {
  const cls =
    kind === "error"
      ? "border-red-200 bg-red-50 text-[var(--color-danger)]"
      : "border-blue-200 bg-blue-50 text-[var(--color-brand-strong)]";
  return (
    <p role="alert" className={`mb-3 rounded-md border px-3 py-2 text-sm ${cls}`}>
      {message}
    </p>
  );
}

export function Spinner() {
  return (
    <span
      aria-label="loading"
      className="inline-block size-4 animate-spin rounded-full border-2 border-neutral-300 border-t-[var(--color-brand)]"
    />
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium text-[var(--color-muted)]">{children}</th>;
}

export function Td({ children }: { children?: ReactNode }) {
  return <td className="border-t border-[var(--color-line)] px-3 py-2">{children}</td>;
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
    // biome-ignore lint/a11y/useSemanticElements: role=dialog + aria-label until native <dialog> fits
    <div
      role="dialog"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-[var(--radius-card)] bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
