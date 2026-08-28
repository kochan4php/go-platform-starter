import { createApiClient } from "@starter/contracts";
import { BrandMark, PreferencesProvider, Tooltip } from "@starter/ui";
import { useIsFetching, useIsMutating, useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  type RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth-context";
import { ScrollToTop, useGatewayHealth, useOnline, useStored, useTheme, useToast } from "../lib/ui";
import { OfflineBanner, SessionExpiringBanner } from "./Banners";
import { CommandPalette } from "./CommandPalette";
import { EnvBadge } from "./EnvBadge";
import { MobileBottomNav } from "./MobileBottomNav";
import { SessionMenu } from "./SessionMenu";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { Topbar } from "./Topbar";
import { APP_VERSION, ENV, NAV_GROUPS } from "./nav-config";

/**
 * Dashboard shell. Owns:
 *  - sidebar (collapsible, persisted, focus-aware tooltips)
 *  - topbar (breadcrumb + actions)
 *  - offline/session-expiring banners
 *  - command palette (Ctrl/Cmd+K)
 *  - keyboard shortcuts (g+u, g+r, ?)
 *  - mobile bottom nav fallback
 *  - scroll-to-top + theme + density persistence
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <PreferencesProvider userKey={user?.id ?? "anonymous"}>
      <DashboardShellContent>{children}</DashboardShellContent>
    </PreferencesProvider>
  );
}

function DashboardShellContent({ children }: { children: ReactNode }) {
  const online = useOnline();
  const [theme, setTheme] = useTheme();
  const toast = useToast();
  const [collapsed, setCollapsed] = useStored("sb-collapsed", false);
  const [menuOpen, setMenuOpen] = useStored("sb-mobile-open", false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const busy = useIsFetching() + useIsMutating() > 0;

  const toggleCollapse = useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  // Surface connection loss once per outage.
  useEffect(() => {
    if (!online) toast("error", "Connection lost — retrying…");
  }, [online, toast]);

  // Global keyboard shortcuts (D15, D16). Ignore editable controls.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === "?" && !mod) {
        setHelpOpen(true);
      } else if (!mod && e.key === "g") {
        const next = (code: string) => {
          const target = code === "u" ? "/admin/users" : code === "r" ? "/admin/roles" : null;
          if (target) {
            window.dispatchEvent(new Event("starter:navigation-start"));
            if (document.startViewTransition) document.startViewTransition(() => navigate(target));
            else navigate(target);
          }
        };
        const handler = (e2: KeyboardEvent) => {
          window.removeEventListener("keydown", handler);
          next(e2.key.toLowerCase());
        };
        window.addEventListener("keydown", handler);
        setTimeout(() => window.removeEventListener("keydown", handler), 800);
      }
    };
    window.addEventListener("keydown", fn);
    const showHelp = () => setHelpOpen(true);
    window.addEventListener("starter:show-help", showHelp);
    return () => {
      window.removeEventListener("keydown", fn);
      window.removeEventListener("starter:show-help", showHelp);
    };
  }, [navigate]);

  // Mobile drawer: ESC, focus return, and a complete keyboard focus loop.
  useEffect(() => {
    if (!menuOpen || window.innerWidth >= 1024) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = sidebarRef.current;
    panel?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
      (previous ?? mobileButtonRef.current)?.focus();
    };
  }, [menuOpen, setMenuOpen]);

  // Preserve each route's position inside the real scrolling element (D74).
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const key = `route-scroll:${pathname}`;
    const saved = Number(sessionStorage.getItem(key) ?? "0");
    requestAnimationFrame(() => main.scrollTo({ top: saved }));
    const save = () => sessionStorage.setItem(key, String(main.scrollTop));
    main.addEventListener("scroll", save, { passive: true });
    return () => {
      save();
      main.removeEventListener("scroll", save);
    };
  }, [pathname]);

  // Swipe gesture to open drawer on mobile (D32). Touchstart X near edge → swipe.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      tracking = window.innerWidth < 1024 && startX < 24;
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx > 60 && dy < 50) {
        setMenuOpen(true);
        tracking = false;
      }
    };
    const onEnd = () => {
      tracking = false;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [setMenuOpen]);

  return (
    <div className="relative flex h-screen overflow-hidden">
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
          className="ui-modal-backdrop fixed inset-0 z-30 backdrop-blur-[6px] lg:hidden"
        />
      ) : null}

      <Sidebar
        ref={sidebarRef}
        open={menuOpen}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        onClose={() => setMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <SessionExpiringBanner />

        {/* compact mobile identity bar; navigation lives at the bottom */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-3 lg:hidden">
          <BrandMark busy={busy} />
          <EnvBadge env={ENV} />
        </div>

        <Topbar
          theme={theme}
          busy={busy}
          onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <NavigationProgress />
        <main
          ref={mainRef}
          id="main-content"
          className="ui-stage relative flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 md:px-8 md:py-10 lg:pb-10"
        >
          <div className="animate-fade-up">{children}</div>
          <ScrollProgressRail targetRef={mainRef} />
        </main>

        <footer className="hidden items-center justify-between border-t border-[var(--color-line)] px-4 py-4 sm:px-6 md:px-8 lg:flex">
          <FooterStrip />
        </footer>
      </div>

      <MobileBottomNav
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(!menuOpen)}
        menuButtonRef={mobileButtonRef}
      />

      {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} /> : null}
      {helpOpen ? <ShortcutsHelp onClose={() => setHelpOpen(false)} /> : null}
      <WhatsNew />

      <ScrollToTop targetRef={mainRef} />
    </div>
  );
}

const Sidebar = forwardRef<
  HTMLElement,
  {
    open: boolean;
    collapsed: boolean;
    onToggleCollapse(): void;
    onClose(): void;
  }
>(function Sidebar({ open, collapsed, onToggleCollapse, onClose }, ref) {
  const health = useGatewayHealth();
  const busy = useIsFetching() + useIsMutating() > 0;

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)] transition-all duration-300 lg:static lg:z-auto lg:translate-x-0 ${
        collapsed ? "w-[68px] px-3" : "w-[248px] px-6"
      } py-6 ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      <div className={`flex items-center justify-between ${collapsed ? "flex-col gap-3" : ""}`}>
        <BrandMark collapsed={collapsed} tooltip="Platform Console" busy={busy} />
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="ui-hover rounded-lg p-1.5 text-[var(--color-muted)] transition-colors lg:hidden"
        >
          <IconClose />
        </button>
      </div>

      <nav className={`mt-10 flex-1 space-y-5 ${collapsed ? "px-0" : ""}`}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed ? (
              <p className="px-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-muted)]/70">
                {group.label}
              </p>
            ) : null}
            {group.items.map((item) => (
              <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onClose} />
            ))}
          </div>
        ))}
      </nav>

      <div className={`space-y-3 ${collapsed ? "flex flex-col items-center" : ""}`}>
        <HealthPill collapsed={collapsed} state={health} />
        {!collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="ui-hover flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-[var(--color-muted)] transition-colors"
          >
            <IconChevronLeft className="size-3.5 rotate-180" />
            Collapse
          </button>
        ) : (
          <Tooltip label="Expand sidebar">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="ui-hover flex w-full justify-center rounded-xl py-2 text-[var(--color-muted)] transition-colors"
            >
              <IconChevronLeft className="size-3.5" />
            </button>
          </Tooltip>
        )}
        <SessionMenu collapsed={collapsed} />
        <p
          className={`text-center font-mono text-[10px] text-[var(--color-muted)]/50 ${collapsed ? "" : "pt-1"}`}
        >
          v{APP_VERSION}
        </p>
      </div>
    </aside>
  );
});

function useIsActive(to: string) {
  const { pathname } = useLocation();
  return pathname.startsWith(to);
}

interface NavItem {
  to: string;
  label: string;
  Icon: (p: { className?: string }) => ReactNode;
  shortcut?: string;
  badge?: string;
}

const remoteForRoute: Record<string, [string, string]> = {
  "/admin/users": ["web_admin_users", "http://127.0.0.1:5175/assets/remoteEntry.js"],
  "/admin/roles": ["web_admin_roles", "http://127.0.0.1:5176/assets/remoteEntry.js"],
};
const shellAPI = createApiClient();

function preloadRemote(to: string) {
  if (import.meta.env.DEV) return;
  const remote = remoteForRoute[to];
  if (!remote) return;
  const [name, fallback] = remote;
  const configured = (window as Window & { __REMOTE_URLS__?: Record<string, string> }).__REMOTE_URLS__;
  const href = configured?.[name] ?? fallback;
  if (document.querySelector(`link[data-remote-preload="${name}"]`)) return;
  const link = document.createElement("link");
  link.rel = "modulepreload";
  link.href = href;
  link.crossOrigin = "anonymous";
  link.dataset.remotePreload = name;
  document.head.append(link);
}

function useNavBadge(to: string): string | undefined {
  const queryClient = useQueryClient();
  const subscribe = useCallback(
    (notify: () => void) => queryClient.getQueryCache().subscribe(notify),
    [queryClient],
  );
  const snapshot = useCallback(() => {
    if (to === "/admin/users") {
      const rows = queryClient.getQueriesData<{ meta?: { total?: number } }>({ queryKey: ["users"] });
      const total = rows.find(([, data]) => typeof data?.meta?.total === "number")?.[1]?.meta?.total;
      return total == null ? "" : String(total);
    }
    if (to === "/admin/roles") {
      const roles = queryClient.getQueryData<unknown[]>(["roles"]);
      return roles ? String(roles.length) : "";
    }
    return "";
  }, [queryClient, to]);
  return useSyncExternalStore(subscribe, snapshot, snapshot) || undefined;
}

function SidebarLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate(): void;
}) {
  const active = useIsActive(item.to);
  const queryClient = useQueryClient();
  const liveBadge = useNavBadge(item.to) ?? item.badge;
  const warmRoute = () => {
    preloadRemote(item.to);
    if (item.to !== "/admin/users") return;
    void queryClient.prefetchQuery({
      queryKey: [
        "users",
        {
          limit: 20,
          offset: 0,
          q: "",
          presence: "all",
          roleId: 0,
          registeredFrom: "",
          registeredTo: "",
          sort: "createdAt",
          order: "desc",
        },
      ],
      queryFn: async ({ signal }) => {
        const { data, error } = await shellAPI.GET("/api/v1/users", {
          signal,
          params: { query: { limit: 20, offset: 0, sort: "createdAt", order: "desc" } },
        });
        if (error) throw new Error("failed to prefetch users");
        return data?.data;
      },
      staleTime: 30_000,
    });
  };
  return (
    <Link
      to={item.to}
      viewTransition
      onMouseEnter={warmRoute}
      onFocus={warmRoute}
      onClick={() => {
        window.dispatchEvent(new Event("starter:navigation-start"));
        onNavigate();
      }}
      title={collapsed ? `${item.label}${item.shortcut ? ` (${item.shortcut})` : ""}` : undefined}
      className={`group relative flex items-center gap-3 rounded-xl text-sm transition-all duration-200 ${
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
      } ${
        active
          ? "bg-[var(--color-selected)] font-semibold text-[var(--color-ink)]"
          : "ui-hover text-[var(--color-muted)]"
      }`}
    >
      <item.Icon
        className={`size-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
          active ? "text-[var(--color-accent)]" : "group-hover:text-[var(--color-ink)]"
        }`}
      />
      {!collapsed ? (
        <>
          <span className="flex-1">{item.label}</span>
          {liveBadge ? (
            <span className="rounded-full bg-[var(--color-accent)]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--color-accent)]">
              {liveBadge}
            </span>
          ) : null}
          {item.shortcut ? (
            <kbd className="hidden rounded border border-[var(--color-line)] px-1 font-mono text-[10px] text-[var(--color-muted)] sm:inline">
              {item.shortcut}
            </kbd>
          ) : null}
          {active ? <span className="block size-1.5 rounded-full bg-[var(--color-accent)]" /> : null}
        </>
      ) : active ? (
        <span className="sidebar-active-indicator absolute left-0 top-1/2 block h-6 w-0.5 -translate-y-1/2 rounded-r bg-[var(--color-accent)]" />
      ) : null}
    </Link>
  );
}

function HealthPill({ collapsed, state }: { collapsed: boolean; state: "ok" | "down" | "unknown" }) {
  const color =
    state === "ok"
      ? "bg-[var(--color-success)]"
      : state === "down"
        ? "bg-[var(--color-danger)]"
        : "bg-[var(--color-warning)]";
  const label = state === "ok" ? "Gateway healthy" : state === "down" ? "Gateway down" : "Checking…";
  if (collapsed) {
    return (
      <Tooltip label={label}>
        <span className="flex w-full justify-center py-2">
          <span className={`block size-2 rounded-full ${color}`} />
        </span>
      </Tooltip>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] px-3 py-2 text-[11px] text-[var(--color-muted)]">
      <span
        className={`block size-1.5 rounded-full ${color} ${state === "ok" ? "animate-pulse-accent" : ""}`}
      />
      <span className="font-mono uppercase tracking-widest">{label}</span>
    </div>
  );
}

function ScrollProgressRail({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const target = targetRef.current;
      if (!target) return;
      const max = target.scrollHeight - target.clientHeight;
      const next = max > 0 ? Math.min(1, target.scrollTop / max) : 0;
      setProgress(next);
    };
    onScroll();
    const target = targetRef.current;
    target?.addEventListener("scroll", onScroll, { passive: true });
    return () => target?.removeEventListener("scroll", onScroll);
  }, [targetRef]);
  if (progress <= 0) return null;
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-30 h-0.5 w-full bg-transparent">
      <div
        className="h-full bg-[var(--color-accent)] transition-[width] duration-150"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  );
}

function FooterStrip() {
  return (
    <div className="flex w-full items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">
      <p>go-platform-starter · spec-first · schema-per-service</p>
      <nav className="flex items-center gap-4">
        <Link viewTransition to="/admin/users" className="transition-colors hover:text-[var(--color-ink)]">
          Users
        </Link>
        <Link viewTransition to="/admin/roles" className="transition-colors hover:text-[var(--color-ink)]">
          Roles
        </Link>
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-[var(--color-ink)]"
        >
          Docs
        </a>
        <a
          href="/docs/openapi.json"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-[var(--color-ink)]"
        >
          API
        </a>
        <a
          href="/healthz"
          target="_blank"
          rel="noreferrer"
          className="transition-colors hover:text-[var(--color-ink)]"
        >
          Health
        </a>
      </nav>
    </div>
  );
}

function NavigationProgress() {
  const { pathname } = useLocation();
  const [active, setActive] = useState(false);
  useEffect(() => {
    const start = () => setActive(true);
    const pop = () => setActive(true);
    window.addEventListener("starter:navigation-start", start);
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("starter:navigation-start", start);
      window.removeEventListener("popstate", pop);
    };
  }, []);
  useEffect(() => {
    if (!pathname) return;
    const timer = window.setTimeout(() => setActive(false), 320);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  if (!active) return null;
  return (
    <div aria-hidden="true" className="h-0.5 overflow-hidden bg-transparent">
      <span className="block h-full w-2/5 animate-navigation-progress bg-[var(--color-accent)]" />
    </div>
  );
}

function WhatsNew() {
  const [seen, setSeen] = useStored(`whats-new:${APP_VERSION}`, false);
  const [open, setOpen] = useState(!seen);
  if (!open) return null;
  const close = () => {
    setSeen(true);
    setOpen(false);
  };
  return (
    <div className="ui-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-[6px]">
      <dialog
        open
        aria-labelledby="whats-new-title"
        className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-2xl"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-accent)]">
          Version {APP_VERSION}
        </p>
        <h2 id="whats-new-title" className="mt-2 text-xl font-bold tracking-tight">
          What changed
        </h2>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--color-muted)]">
          <li>Saved scroll positions and keyboard shortcuts.</li>
          <li>Live refresh, bulk actions, imports, and exports.</li>
          <li>Per-user timezone, density, theme, and optional sound preferences.</li>
        </ul>
        <button
          type="button"
          onClick={close}
          className="mt-6 rounded-xl bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-[var(--color-canvas)]"
        >
          Continue
        </button>
      </dialog>
    </div>
  );
}

function IconChevronLeft({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
      focusable="false"
    >
      <title>chevron</title>
      <path d="m10 3-5 5 5 5" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="size-[18px]"
      aria-hidden
      focusable="false"
    >
      <title>close</title>
      <path d="M3.5 3.5l9 9m0-9-9 9" />
    </svg>
  );
}
