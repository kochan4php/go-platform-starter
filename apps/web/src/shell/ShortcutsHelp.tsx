import { useEffect, useRef } from "react";

interface ShortcutsHelpProps {
  onClose(): void;
}

const ROWS: { keys: string; action: string }[] = [
  { keys: "Ctrl/⌘ + K", action: "Open command palette" },
  { keys: "g u", action: "Go to Users" },
  { keys: "g r", action: "Go to Roles & Permissions" },
  { keys: "?", action: "Show this help" },
  { keys: "ESC", action: "Close dialogs / drawer" },
  { keys: "j / k", action: "Move row selection (lists)" },
];

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: native <dialog> lacks Tailwind+JSX ergonomics here
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="ui-modal-backdrop fixed inset-0 z-[120] flex items-center justify-center p-4 backdrop-blur-[6px]"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ui-hover rounded-md p-1 text-[var(--color-muted)] transition-colors"
          >
            ×
          </button>
        </div>
        <ul className="space-y-2.5">
          {ROWS.map((row) => (
            <li key={row.keys} className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted)]">{row.action}</span>
              <kbd className="rounded border border-[var(--color-line)] bg-[var(--color-elevated)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-ink)]">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
