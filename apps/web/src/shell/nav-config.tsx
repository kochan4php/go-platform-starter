import { Key, SlidersHorizontal, UsersThree } from "@phosphor-icons/react";
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

export interface NavItem {
  to: string;
  label: string;
  Icon: (p: { className?: string; weight?: "regular" }) => ReactNode;
  shortcut?: string;
  badge?: string;
  keywords?: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Management",
    items: [
      {
        to: "/admin/users",
        label: "Users",
        Icon: UsersThree,
        shortcut: "g u",
        keywords: ["people", "accounts", "members"],
      },
      {
        to: "/admin/roles",
        label: "Roles & Permissions",
        Icon: Key,
        shortcut: "g r",
        keywords: ["rbac", "access", "perms"],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        to: "/admin/settings",
        label: "Settings",
        Icon: SlidersHorizontal,
        keywords: ["preferences", "config"],
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function routeMeta(pathname: string): Pick<NavItem, "to" | "label"> {
  const match = ALL_NAV_ITEMS.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
  return match ?? { to: pathname, label: "Dashboard" };
}
