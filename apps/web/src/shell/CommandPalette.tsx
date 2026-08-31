import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_NAV_ITEMS } from "./nav-config";

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  group: "navigation" | "users" | "roles" | "actions" | "docs";
  to?: string;
  run?: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  onClose(): void;
}

/** Cheap fuzzy match: every query char must appear in order inside the text. */
function fuzzy(haystack: string, needle: string): number | null {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let hi = 0;
  let score = 0;
  let prevMatch = -1;
  for (let ni = 0; ni < n.length; ni++) {
    const idx = h.indexOf(n[ni], hi);
    if (idx < 0) return null;
    if (prevMatch >= 0 && idx - prevMatch === 1) score += 5; // consecutive bonus
    prevMatch = idx;
    hi = idx + 1;
    score += 1;
  }
  return score;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const items = useMemo<PaletteItem[]>(() => {
    const nav = ALL_NAV_ITEMS.map((n) => ({
      id: `nav:${n.to}`,
      label: n.label,
      hint: n.shortcut,
      group: "navigation" as const,
      to: n.to,
      keywords: n.keywords,
    }));
    const actions: PaletteItem[] = [
      {
        id: "act:theme",
        label: "Toggle theme",
        group: "actions",
        run: () => window.dispatchEvent(new Event("starter:toggle-theme")),
      },
      {
        id: "act:density",
        label: "Toggle table density",
        group: "actions",
        run: () => window.dispatchEvent(new Event("starter:toggle-density")),
      },
      {
        id: "act:help",
        label: "Show keyboard shortcuts",
        group: "actions",
        run: () => window.dispatchEvent(new Event("starter:show-help")),
      },
    ];
    const docs: PaletteItem[] = [
      {
        id: "doc:openapi",
        label: "API reference",
        group: "docs",
        run: () => window.open("/docs", "_blank", "noopener"),
      },
      {
        id: "doc:health",
        label: "Gateway health",
        group: "docs",
        run: () => window.open("/healthz", "_blank", "noopener"),
      },
    ];
    const cachedUsers = queryClient
      .getQueriesData<{ items?: Array<{ id: number; displayName?: string; email?: string }> }>({
        queryKey: ["users"],
      })
      .flatMap(([, data]) => data?.items ?? [])
      .filter((user, index, rows) => rows.findIndex((candidate) => candidate.id === user.id) === index)
      .map<PaletteItem>((user) => ({
        id: `user:${user.id}`,
        label: user.displayName || user.email || `User ${user.id}`,
        hint: user.email,
        group: "users",
        to: "/admin/users",
        keywords: [user.email ?? "", String(user.id)],
      }));
    const cachedRoles = (
      queryClient.getQueryData<Array<{ id: number; name: string }>>(["roles"]) ?? []
    ).map<PaletteItem>((role) => ({
      id: `role:${role.id}`,
      label: role.name,
      group: "roles",
      to: "/admin/roles",
      keywords: ["role", String(role.id)],
    }));
    return [...cachedUsers, ...cachedRoles, ...nav, ...actions, ...docs];
  }, [queryClient]);

  const filtered = useMemo(() => {
    if (!query) return items.slice(0, 10);
    const scored = items
      .map((it) => {
        const haystack = `${it.label} ${it.hint ?? ""} ${it.keywords?.join(" ") ?? ""}`;
        const score = fuzzy(haystack, query);
        return { it, score };
      })
      .filter((x): x is { it: PaletteItem; score: number } => x.score != null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x) => x.it);
    return scored;
  }, [items, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ESC closes, ↑/↓ navigates, Enter activates.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const chosen = filtered[active];
        if (!chosen) return;
        if (chosen.to) {
          window.dispatchEvent(new Event("starter:navigation-start"));
          if (document.startViewTransition) document.startViewTransition(() => navigate(chosen.to as string));
          else navigate(chosen.to);
        } else chosen.run?.();
        onClose();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [active, filtered, navigate, onClose]);

  // Reset active when query changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only `query` should reset; rest are intentionally inert
  useEffect(() => setActive(0), [query]);

  return (
    <div
      className="ui-modal-backdrop fixed inset-0 z-[var(--z-command)] flex items-start justify-center p-4 pt-[10vh] backdrop-blur-[6px]"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        // biome-ignore lint/a11y/useSemanticElements: native <dialog> lacks Tailwind+JSX ergonomics here
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-4 text-[var(--color-muted)]"
            aria-hidden
            focusable="false"
          >
            <title>search</title>
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 3 3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, search, or jump to…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
            aria-label="Search palette"
            role="combobox"
            aria-controls="palette-options"
            aria-expanded="true"
            aria-autocomplete="list"
          />
          <kbd className="rounded border border-[var(--color-line)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[var(--color-muted)]">
            ESC
          </kbd>
        </div>
        <ul id="palette-options" className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-[var(--color-muted)]">No matches.</li>
          ) : null}
          {filtered.map((it, i) => (
            <li key={it.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  if (it.to) {
                    window.dispatchEvent(new Event("starter:navigation-start"));
                    if (document.startViewTransition)
                      document.startViewTransition(() => navigate(it.to as string));
                    else navigate(it.to);
                  } else it.run?.();
                  onClose();
                }}
                aria-selected={i === active}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                  i === active
                    ? "bg-[var(--color-selected)] text-[var(--color-ink)]"
                    : "ui-hover text-[var(--color-muted)]"
                }`}
              >
                <span className="flex-1 truncate">{it.label}</span>
                {it.hint ? (
                  <kbd className="rounded border border-[var(--color-line)] px-1 font-mono text-[10px]">
                    {it.hint}
                  </kbd>
                ) : null}
                <span className="rounded bg-[var(--color-elevated)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--color-muted)]">
                  {it.group}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
