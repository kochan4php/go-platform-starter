import { usePreferences } from "@starter/ui";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStored, useToast } from "../lib/ui";
import { EnvBadge } from "./EnvBadge";
import { ALL_NAV_ITEMS, ENV } from "./nav-config";

interface TopbarProps {
  theme: "dark" | "light";
  busy: boolean;
  onToggleTheme(): void;
  onOpenPalette(): void;
}

function useBreadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Admin", href: "/admin/users" }];
  const crumbs = [{ label: "Admin", href: "/admin/users" }];
  const match = ALL_NAV_ITEMS.find((n) => n.to.endsWith(segments[segments.length - 1] ?? ""));
  crumbs.push({ label: match?.label ?? "Dashboard", href: "" });
  return crumbs;
}

export function Topbar({ theme, busy, onToggleTheme, onOpenPalette }: TopbarProps) {
  const crumbs = useBreadcrumb();
  const [now, setNow] = useState(() => new Date());
  const [density, setDensity] = useStored<"compact" | "comfortable">("ui-density", "comfortable");
  const toast = useToast();
  const { timeZone } = usePreferences();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onToggle = () => {
      const updated = density === "compact" ? "comfortable" : "compact";
      setDensity(updated);
      document.documentElement.dataset.density = updated;
      toast("info", `Table density: ${updated}`);
    };
    window.addEventListener("starter:toggle-density", onToggle);
    return () => window.removeEventListener("starter:toggle-density", onToggle);
  }, [density, setDensity, toast]);

  useEffect(() => {
    const onToggle = () => onToggleTheme();
    window.addEventListener("starter:toggle-theme", onToggle);
    return () => window.removeEventListener("starter:toggle-theme", onToggle);
  }, [onToggleTheme]);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-canvas)]/80 px-4 py-4 backdrop-blur-md sm:px-6 md:px-8">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]"
      >
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? <span className="text-[var(--color-line)]">/</span> : null}
            {c.href ? (
              <Link viewTransition to={c.href} className="transition-colors hover:text-[var(--color-ink)]">
                {c.label}
              </Link>
            ) : (
              <span className="text-[var(--color-ink)]">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <output
          aria-live="polite"
          className={`hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest sm:inline-flex ${
            busy ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"
          }`}
        >
          <span
            className={`block size-1.5 rounded-full ${busy ? "animate-pulse bg-[var(--color-accent)]" : "bg-[var(--color-success)]"}`}
          />
          {busy ? "syncing" : "synced"}
        </output>
        <span className="hidden font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)] sm:inline">
          updated {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone })}
        </span>
        <EnvBadge env={ENV} />

        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="Open command palette"
          title="Command palette (Ctrl+K)"
          className="ui-hover flex items-center gap-2 rounded-xl border border-[var(--color-line)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-3.5"
            aria-hidden
            focusable="false"
          >
            <title>search</title>
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 3 3" />
          </svg>
          <span className="hidden sm:inline">Search…</span>
          <kbd className="rounded border border-[var(--color-line)] px-1 font-mono text-[10px]">⌘K</kbd>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="ui-hover rounded-xl border border-[var(--color-line)] p-1.5 text-[var(--color-muted)] transition-colors"
        >
          {theme === "dark" ? (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-4"
              aria-hidden
              focusable="false"
            >
              <title>sun</title>
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1v2M8 13v2M3 8H1M15 8h-2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4 5 11M11 5l1.4-1.4" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-4"
              aria-hidden
              focusable="false"
            >
              <title>moon</title>
              <path d="M13 9.5A5 5 0 0 1 6.5 3 6 6 0 1 0 13 9.5Z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
