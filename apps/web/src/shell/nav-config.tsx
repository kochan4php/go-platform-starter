import type { ReactNode } from "react";

declare global {
  interface Window {
    __STARTER_ENV__?: "dev" | "uat" | "demo" | "prod" | string;
    __STARTER_VERSION__?: string;
  }
}

export const APP_VERSION =
  (typeof window !== "undefined" ? window.__STARTER_VERSION__ : undefined) ?? "0.6.0";

export const ENV = (typeof window !== "undefined" ? window.__STARTER_ENV__ : "dev") ?? "dev";

interface NavItem {
  to: string;
  label: string;
  Icon: (p: { className?: string }) => ReactNode;
  shortcut?: string;
  badge?: string;
  keywords?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const IconUsers = ({ className = "" }: { className?: string }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative; the navigation link supplies the accessible name
  <svg viewBox="0 0 24 24" className={`ui-nav-icon ${className || "size-4"}`} aria-hidden>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19c.4-3.4 2.5-5.3 5.5-5.3s5.1 1.9 5.5 5.3" />
    <path d="M15.5 5.4a3 3 0 0 1 0 5.2M16.5 14c2.2.7 3.6 2.3 4 5" />
  </svg>
);

const IconAccess = ({ className = "" }: { className?: string }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative; the navigation link supplies the accessible name
  <svg viewBox="0 0 24 24" className={`ui-nav-icon ${className || "size-4"}`} aria-hidden>
    <circle cx="8.5" cy="12" r="3.5" />
    <path d="M12 12h8M17 12v3M14.5 12v2" />
  </svg>
);

const IconSettings = ({ className = "" }: { className?: string }) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: decorative; the navigation link supplies the accessible name
  <svg viewBox="0 0 24 24" className={`ui-nav-icon ${className || "size-4"}`} aria-hidden>
    <path d="M4 7h6M14 7h6M4 17h10M18 17h2" />
    <circle cx="12" cy="7" r="2" />
    <circle cx="16" cy="17" r="2" />
  </svg>
);

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Management",
    items: [
      {
        to: "/admin/users",
        label: "Users",
        Icon: IconUsers,
        shortcut: "g u",
        keywords: ["people", "accounts", "members"],
      },
      {
        to: "/admin/roles",
        label: "Roles & Permissions",
        Icon: IconAccess,
        shortcut: "g r",
        keywords: ["rbac", "access", "perms"],
      },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/settings", label: "Settings", Icon: IconSettings, keywords: ["preferences", "config"] },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
