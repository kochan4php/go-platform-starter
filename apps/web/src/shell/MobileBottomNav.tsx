import type { RefObject } from "react";
import { Link, useLocation } from "react-router-dom";
import { ALL_NAV_ITEMS } from "./nav-config";

export function MobileBottomNav({
  menuOpen,
  onToggleMenu,
  menuButtonRef,
}: {
  menuOpen: boolean;
  onToggleMenu(): void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
}) {
  const { pathname } = useLocation();
  const items = ALL_NAV_ITEMS.slice(0, 4);
  return (
    <nav
      aria-label="Mobile navigation"
      className="ui-mobile-nav fixed inset-x-0 bottom-0 z-30 grid border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 px-2 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md lg:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            viewTransition
            onClick={() => window.dispatchEvent(new Event("starter:navigation-start"))}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${
              active
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            <item.Icon className="size-6" />
            <span className="w-full truncate text-center">{mobileLabel(item.label)}</span>
          </Link>
        );
      })}
      <button
        ref={menuButtonRef}
        type="button"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        onClick={onToggleMenu}
        className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors ${
          menuOpen
            ? "bg-[var(--color-selected)] text-[var(--color-accent)]"
            : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        }`}
      >
        <MenuIcon open={menuOpen} />
        <span>Menu</span>
      </button>
    </nav>
  );
}

function mobileLabel(label: string) {
  if (label === "Roles & Permissions") return "Roles";
  return label;
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative; the menu button supplies the accessible name
    <svg viewBox="0 0 24 24" className="ui-nav-icon size-6" aria-hidden>
      {open ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}
