import { useGSAP } from "@gsap/react";
import { ArrowRight, PencilSimple } from "@phosphor-icons/react";
import { GATEWAY_URL, getAccessToken } from "@starter/contracts";
import {
  Alert,
  Avatar,
  Button,
  Card,
  ExpandableText,
  Field,
  Input,
  Modal,
  ModalActions,
  ModalSection,
  SkeletonBlock,
  SkeletonLine,
  Spinner,
  Stat,
  Td,
  formatDateTime,
  formatNumber,
  relativeTime,
  useConfirm,
  useDrawer,
  usePageVisible,
  usePreferences,
  useStored,
  useToast,
} from "@starter/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Fragment,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "./api-client";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface Profile {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string;
  status: "active" | "inactive";
  lockedUntil?: string | null;
  roles?: Array<{ id: number; name: string }>;
  online?: boolean;
  activeSessions?: number;
  lastLoginAt?: string | null;
  lastLoginIp?: string;
  lastLoginUserAgent?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ListMeta {
  limit: number;
  offset: number;
  total: number;
}

const PAGE_SIZES = [10, 20, 50] as const;

type SortField = "createdAt" | "displayName" | "email" | "lastLoginAt";
type SortDirection = "asc" | "desc";
type ColumnKey =
  | "select"
  | "id"
  | "user"
  | "email"
  | "role"
  | "status"
  | "lastLogin"
  | "created"
  | "ip"
  | "device"
  | "actions";

interface UserFilters {
  query: string;
  status: "all" | "online" | "offline";
  roleId: number;
  registeredFrom: string;
  registeredTo: string;
}

interface FilterPreset extends UserFilters {
  name: string;
}

interface ActivityItem {
  id: string;
  label: string;
  at: Date;
}

const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  select: true,
  id: false,
  user: true,
  email: false,
  role: true,
  status: true,
  lastLogin: true,
  created: false,
  ip: false,
  device: true,
  actions: true,
};

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  select: 48,
  id: 110,
  user: 300,
  email: 250,
  role: 180,
  status: 100,
  lastLogin: 140,
  created: 140,
  ip: 150,
  device: 170,
  actions: 430,
};

/** Compact browser-os label from a raw User-Agent string. */
export function deviceLabel(ua?: string): string {
  if (!ua) return "—";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : /curl/.test(ua)
              ? "curl"
              : "Unknown";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iOS"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return [browser, os].filter(Boolean).join(" · ");
}

function deviceIcon(ua?: string): string {
  if (/Android|iPhone|iPad|iOS/.test(ua ?? "")) return "▯";
  if (/Windows|Mac OS|Linux/.test(ua ?? "")) return "▣";
  return "◇";
}

function ipDescription(ip?: string): string {
  if (!ip) return "No IP recorded";
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd)/i.test(ip)) {
    return "Private or loopback network address";
  }
  return "Public network address";
}

const REVEAL =
  "Every profile on this platform is provisioned by auth events, materialized by streams, and flushed through idempotent workers.";
const REVEAL_WORDS = (() => {
  const seen = new Map<string, number>();
  return REVEAL.split(" ").map((word) => {
    const occurrence = seen.get(word) ?? 0;
    seen.set(word, occurrence + 1);
    return { id: `${word}-${occurrence}`, word };
  });
})();

function dateBoundary(value: string | undefined, end: boolean): string | undefined {
  if (!value) return undefined;
  return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`).toISOString();
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function randomPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `Aa1!${[...bytes].map((byte) => alphabet[byte % alphabet.length]).join("")}`;
}

async function copyText(
  value: string,
  notify: (kind: "success" | "error", message: string) => void,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    notify("success", "Copied to clipboard");
  } catch {
    notify("error", "Clipboard access was denied");
  }
}

/** Query keys follow docs/QUERY_KEYS.md: ['users', filters], ['user', id]. */
export default function UsersPage() {
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerSeed, setRegisterSeed] = useState<Profile | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [activeRow, setActiveRow] = useState(0);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(() => new Set());
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [presetName, setPresetName] = useState("");
  const [importing, setImporting] = useState(false);
  const [newUserId, setNewUserId] = useState<number | null>(null);
  const [bulkRoleId, setBulkRoleId] = useState(0);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const drawer = useDrawer();
  const pageVisible = usePageVisible();
  const { userKey, timeZone } = usePreferences();
  const [filters, setFilters] = useStored<UserFilters>(`users-filters:v2:${userKey}`, {
    query: "",
    status: "all",
    roleId: 0,
    registeredFrom: "",
    registeredTo: "",
  });
  const applyFilters = (next: UserFilters) => {
    setOffset(0);
    setFilters(next);
  };
  const [presets, setPresets] = useStored<FilterPreset[]>(`users-filter-presets:v2:${userKey}`, []);
  const [visibleColumns, setVisibleColumns] = useStored<Record<ColumnKey, boolean>>(
    `users-columns:v3:${userKey}`,
    DEFAULT_COLUMNS,
  );
  const [columnWidths, setColumnWidths] = useStored<Record<ColumnKey, number>>(
    `users-column-widths:v3:${userKey}`,
    DEFAULT_WIDTHS,
  );
  const [liveEnabled, setLiveEnabled] = useStored(`users-live:${userKey}`, true);
  const [pageSize, setPageSize] = useStored<(typeof PAGE_SIZES)[number]>(`users-page-size:${userKey}`, 20);
  const [zebraRows, setZebraRows] = useStored(`users-zebra:${userKey}`, false);
  const [compactRows, setCompactRows] = useStored(`users-compact:${userKey}`, false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const importRef = useRef<HTMLInputElement>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const deferredQuery = useDebouncedValue(filters.query.trim(), 300);

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/roles");
      if (error) throw new Error("failed to load roles");
      return (data?.data as { items?: { id: number; name: string }[] })?.items ?? [];
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
  const stats = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/users/stats");
      if (error) throw new Error("failed to load user stats");
      return data?.data as {
        total: number;
        online: number;
        registrations: Array<{ day: string; count: number }>;
      };
    },
    refetchInterval: liveEnabled && pageVisible ? 30_000 : false,
  });

  const users = useQuery({
    queryKey: [
      "users",
      {
        limit: pageSize,
        offset,
        q: deferredQuery,
        presence: filters.status,
        roleId: filters.roleId,
        registeredFrom: filters.registeredFrom,
        registeredTo: filters.registeredTo,
        sort: sortField,
        order: sortDirection,
      },
    ],
    queryFn: async ({ signal }) => {
      const { data, error } = await api.GET("/api/v1/users", {
        signal,
        params: {
          query: {
            limit: pageSize,
            offset,
            q: deferredQuery || undefined,
            presence: filters.status === "all" ? undefined : filters.status,
            roleId: filters.roleId || undefined,
            registeredFrom: dateBoundary(filters.registeredFrom, false),
            registeredTo: dateBoundary(filters.registeredTo, true),
            sort: sortField,
            order: sortDirection,
          },
        },
      });
      if (error) throw new Error((error as { message?: string }).message ?? "failed to load users");
      return (data?.data ?? { items: [], meta: { limit: pageSize, offset: 0, total: 0 } }) as {
        items: Profile[];
        meta: ListMeta;
      };
    },
    placeholderData: (previous) => previous,
    refetchInterval: liveEnabled && pageVisible ? 30_000 : false,
    refetchIntervalInBackground: false,
  });

  const addActivity = useCallback((label: string) => {
    setActivity((current) =>
      [{ id: `${Date.now()}-${Math.random()}`, label, at: new Date() }, ...current].slice(0, 8),
    );
  }, []);

  const invalidateUsers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["user-stats"] });
  }, [queryClient]);
  const realtime = useRealtimeUsers(liveEnabled, invalidateUsers, addActivity);

  const total = stats.data?.total ?? users.data?.meta.total ?? 0;

  // GSAP pass one: numeral count-up once the first page resolves.
  useGSAP(
    () => {
      if (import.meta.env.MODE === "test") return;
      if (!countRef.current || total === 0) return;
      const state = { n: 0 };
      gsap.to(state, {
        n: total,
        duration: 1.1,
        ease: "power3.out",
        onUpdate: () => {
          if (countRef.current) countRef.current.textContent = String(Math.round(state.n));
        },
      });
    },
    { scope: rootRef, dependencies: [total] },
  );

  // GSAP pass two: scroll-scrubbed art plate + word-by-word reveal.
  useGSAP(
    () => {
      if (import.meta.env.MODE === "test") return;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (reduce) return;

      for (const el of gsap.utils.toArray<HTMLElement>("[data-art]")) {
        gsap.fromTo(
          el,
          { scale: 0.8, opacity: 0.25 },
          {
            scale: 1,
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 95%", end: "top 45%", scrub: true },
          },
        );
      }

      gsap.fromTo(
        "[data-word]",
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.06,
          ease: "none",
          scrollTrigger: { trigger: "[data-reveal]", start: "top 90%", end: "top 55%", scrub: true },
        },
      );
    },
    { scope: rootRef, dependencies: [users.isSuccess] },
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["users"] }),
      queryClient.invalidateQueries({ queryKey: ["user-stats"] }),
    ]);
  };

  const remove = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(
        ids.map(async (id) => {
          const sessions = await api.DELETE("/api/v1/auth/users/{id}/sessions", {
            params: { path: { id } },
          });
          if (sessions.error) throw new Error(`session cleanup failed for user ${id}`);
          const { error } = await api.DELETE("/api/v1/users/{id}", { params: { path: { id } } });
          if (error) throw new Error(`delete failed for user ${id}`);
        }),
      );
      return ids;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const previous = queryClient.getQueriesData<{ items: Profile[]; meta: ListMeta }>({
        queryKey: ["users"],
      });
      const removed = new Set(ids);
      queryClient.setQueriesData<{ items: Profile[]; meta: ListMeta }>(
        { queryKey: ["users"] },
        (current) =>
          current && {
            ...current,
            items: current.items.filter((profile) => !removed.has(profile.id)),
            meta: { ...current.meta, total: Math.max(0, current.meta.total - ids.length) },
          },
      );
      return { previous };
    },
    onSuccess: (ids) => {
      setPendingDeleteIds((current) => {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
      setSelectedIds(new Set<number>());
      refresh();
      addActivity(`${formatNumber(ids.length)} user${ids.length === 1 ? "" : "s"} deleted`);
      realtime.broadcast("delete");
      toast("success", `${formatNumber(ids.length)} user${ids.length === 1 ? "" : "s"} deleted`);
    },
    onError: (err, _ids, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
      setPendingDeleteIds(new Set<number>());
      toast("error", (err as Error).message);
    },
  });

  const queueDelete = (targets: Profile[]) => {
    const ids = targets.map((user) => user.id);
    setPendingDeleteIds((current) => new Set([...current, ...ids]));
    const timer = window.setTimeout(() => remove.mutate(ids), 5_000);
    toast.undo(
      `${formatNumber(ids.length)} user${ids.length === 1 ? "" : "s"} queued for deletion`,
      () => {
        window.clearTimeout(timer);
        setPendingDeleteIds((current) => {
          const next = new Set(current);
          for (const id of ids) next.delete(id);
          return next;
        });
        toast("success", "Deletion cancelled");
      },
      { timeoutMs: 5_500 },
    );
  };

  const requestDelete = async (targets: Profile[]) => {
    if (targets.length === 0) return;
    const expected = targets.length === 1 ? targets[0].email : `DELETE ${targets.length}`;
    const typed = window.prompt(`Type ${expected} to confirm permanent deletion.`);
    if (typed !== expected) {
      if (typed !== null) toast("error", "Deletion confirmation did not match");
      return;
    }
    const subject =
      targets.length === 1 ? targets[0]?.displayName || targets[0]?.email : `${targets.length} users`;
    const ok = await confirm(
      `Delete ${subject}?`,
      "Deletion starts in five seconds. Until then, you can undo it from the toast.",
      { danger: true, label: "Delete" },
    );
    if (!ok) return;
    queueDelete(targets);
  };

  const queryItems = users.data?.items ?? [];
  const immediateNeedle = filters.query.trim().toLowerCase();
  const items = queryItems.filter(
    (user) =>
      !pendingDeleteIds.has(user.id) &&
      (!immediateNeedle || `${user.displayName} ${user.email}`.toLowerCase().includes(immediateNeedle)),
  );

  const openDetail = useCallback(
    (user: Profile) => {
      drawer.open({
        title: "User details",
        content: <UserDetail user={user} timeZone={timeZone} />,
      });
    },
    [drawer, timeZone],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key !== "j" && event.key !== "k") return;
      event.preventDefault();
      setActiveRow((current) => {
        const next = event.key === "j" ? Math.min(current + 1, items.length - 1) : Math.max(current - 1, 0);
        document.querySelector<HTMLElement>(`[data-user-row='${next}']`)?.focus();
        return next;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [items.length]);

  const toggleSort = (field: SortField) => {
    setOffset(0);
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportUsers = (format: "csv" | "json", source = items.filter((user) => selectedIds.has(user.id))) => {
    const rows = source.length > 0 ? source : items;
    const body =
      format === "json"
        ? JSON.stringify(rows, null, 2)
        : [
            "id,email,displayName,online,lastLoginAt",
            ...rows.map((user) =>
              [user.id, user.email, user.displayName, Boolean(user.online), user.lastLoginAt ?? ""]
                .map(csvCell)
                .join(","),
            ),
          ].join("\n");
    const url = URL.createObjectURL(
      new Blob([body], { type: format === "json" ? "application/json" : "text/csv" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `users-${new Date().toISOString().slice(0, 10)}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
    addActivity(`${formatNumber(rows.length)} users exported as ${format.toUpperCase()}`);
    toast("success", `${formatNumber(rows.length)} users exported`);
  };

  const importCsv = async (file: File) => {
    setImporting(true);
    try {
      const rows = parseCsv(await file.text());
      let created = 0;
      for (const row of rows) {
        if (!row.email || !row.password) continue;
        const registration = await api.POST("/api/v1/auth/register", {
          body: { email: row.email, password: row.password },
        });
        if (registration.error) throw new Error(`Could not import ${row.email}`);
        const id = (registration.data?.data as { id: number }).id;
        if (row.displayName || row.avatarUrl) {
          const profile = await api.PATCH("/api/v1/users/{id}", {
            params: { path: { id } },
            body: { id, displayName: row.displayName, avatarUrl: row.avatarUrl },
          });
          if (profile.error) throw new Error(`Imported ${row.email}, but profile details failed`);
        }
        created += 1;
      }
      await refresh();
      realtime.broadcast("import");
      addActivity(`${formatNumber(created)} users imported`);
      toast("success", `${formatNumber(created)} users imported`);
    } catch (error) {
      toast("error", (error as Error).message);
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };

  const startResize = (key: ColumnKey, event: ReactPointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = columnWidths[key];
    const onMove = (move: PointerEvent) => {
      const width = Math.max(72, startWidth + move.clientX - startX);
      setColumnWidths({ ...columnWidths, [key]: width });
    };
    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop, { once: true });
  };

  if (users.isPending) {
    return (
      <div className="space-y-6">
        <SkeletonLine w="w-1/3" />
        <div className="grid grid-cols-2 gap-px md:grid-cols-6">
          <SkeletonBlock h="h-44 col-span-4" />
          <SkeletonBlock h="h-44 col-span-2" />
          <SkeletonBlock h="h-32 col-span-2" />
          <SkeletonBlock h="h-32 col-span-2" />
          <SkeletonBlock h="h-32 col-span-2" />
          <SkeletonBlock h="h-12 col-span-6" />
        </div>
        <SkeletonBlock h="h-72" />
        <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--color-line)] p-4">
          {["one", "two", "three", "four", "five", "six"].map((key) => (
            <div key={key} className="grid grid-cols-5 gap-3">
              <SkeletonLine w="col-span-2" />
              <SkeletonLine />
              <SkeletonLine />
              <SkeletonLine />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (users.isError)
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <svg
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="size-12 text-[var(--color-danger)]/60"
          aria-hidden
          focusable="false"
        >
          <title>error</title>
          <circle cx="32" cy="32" r="22" />
          <path d="M32 18v18M32 44v2" />
        </svg>
        <p className="text-sm text-[var(--color-muted)]">{(users.error as Error).message}</p>
        <Button onClick={() => users.refetch()}>Retry</Button>
      </div>
    );

  const { meta } = users.data;
  const newest = items[0];
  const pageCount = Math.max(1, Math.ceil(meta.total / pageSize));
  const currentPage = Math.floor(offset / pageSize) + 1;
  const visibleKeys = (Object.keys(visibleColumns) as ColumnKey[]).filter((key) => visibleColumns[key]);
  const selectedUsers = items.filter((user) => selectedIds.has(user.id));
  const assignBulkRole = async () => {
    if (!bulkRoleId || selectedUsers.length === 0) return;
    setBulkAssigning(true);
    try {
      await Promise.all(
        selectedUsers.map(async (user) => {
          const roleIds = [...new Set([...(user.roles ?? []).map((role) => role.id), bulkRoleId])];
          const { error } = await api.PUT("/api/v1/rbac/users/{id}/roles", {
            params: { path: { id: user.id } },
            body: { roleIds },
          });
          if (error) throw new Error(`Could not assign role to ${user.email}`);
        }),
      );
      setSelectedIds(new Set<number>());
      setBulkRoleId(0);
      await refresh();
      toast("success", `Role assigned to ${formatNumber(selectedUsers.length)} users`);
    } catch (error) {
      toast("error", (error as Error).message);
    } finally {
      setBulkAssigning(false);
    }
  };

  return (
    <div ref={rootRef} className="space-y-8">
      {/* masthead */}
      <div data-reveal className="max-w-5xl">
        <h2 className="text-[clamp(1.6rem,2.4vw,2.4rem)] font-extrabold leading-tight tracking-tight">
          {REVEAL_WORDS.map((token) => (
            <span key={token.id} data-word className="inline-block">
              {token.word}
              {"\u00A0"}
            </span>
          ))}
        </h2>
      </div>

      {/* Responsive directory summary: stacked, paired, then six-column bento. */}
      <div
        data-testid="profiles-summary"
        data-performance-region="bento"
        className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:auto-flow-dense lg:grid-cols-6"
      >
        <button
          type="button"
          title="Clear filters and show every profile"
          onClick={() =>
            applyFilters({ query: "", status: "all", roleId: 0, registeredFrom: "", registeredTo: "" })
          }
          className="ui-card min-h-40 rounded-none border-0 text-left sm:col-span-2 sm:min-h-52 lg:col-span-4 lg:row-span-2"
        >
          <Stat
            label="Profiles on record"
            value={<span ref={countRef}>0</span>}
            hint={`showing ${items.length} on this page · ${pageCount} page${pageCount > 1 ? "s" : ""}`}
          />
        </button>

        <div className="relative min-h-40 overflow-hidden sm:min-h-52 lg:col-span-2 lg:row-span-2 lg:min-h-[220px]">
          <img
            data-art
            src="https://picsum.photos/seed/directory-noir/900/900"
            width="900"
            height="900"
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-80 grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <p className="absolute bottom-5 left-5 font-mono text-[11px] uppercase tracking-[0.28em] text-white/75">
            directory
          </p>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-4 p-5 sm:p-6 lg:col-span-2">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Latest arrival</p>
          {newest ? (
            <div className="flex items-center gap-3">
              <Avatar seed={newest.id} label={newest.displayName || newest.email} alt="" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{newest.displayName || newest.email}</p>
                <p className="truncate font-mono text-[11px] text-[var(--color-muted)]">{newest.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">No profiles yet.</p>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-between gap-4 p-5 sm:p-6 lg:col-span-2">
          <div className="flex h-full flex-col justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Window</p>
            <div>
              <p className="font-mono text-sm tabular-nums">
                {offset + 1}–{Math.min(offset + items.length, meta.total)} / {meta.total}
              </p>
              <Button
                onClick={() => {
                  setRegisterSeed(null);
                  setRegistering(true);
                }}
                className="mt-2 w-full"
              >
                New user
              </Button>
              <button
                type="button"
                onClick={() => applyFilters({ ...filters, status: "online" })}
                className="mt-3 block text-left text-xs text-[var(--color-success)] hover:underline"
              >
                {formatNumber(stats.data?.online ?? 0)} online now
              </button>
              <RegistrationSparkline values={stats.data?.registrations ?? []} />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6 lg:col-span-2">
          <span className="font-mono text-xs text-[var(--color-muted)]">
            page {currentPage} of {pageCount}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              disabled={offset === 0}
              title={offset === 0 ? "Already on the first page" : "First page"}
              onClick={() => setOffset(0)}
            >
              First
            </Button>
            <Button
              variant="ghost"
              disabled={offset === 0}
              title={offset === 0 ? "No previous page" : "Previous page"}
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              disabled={offset + pageSize >= meta.total}
              title={offset + pageSize >= meta.total ? "No next page" : "Next page"}
              onClick={() => setOffset(offset + pageSize)}
            >
              Next
              <ArrowRight size={14} weight="bold" />
            </Button>
            <Button
              variant="ghost"
              disabled={currentPage >= pageCount}
              title={currentPage >= pageCount ? "Already on the last page" : "Last page"}
              onClick={() => setOffset((pageCount - 1) * pageSize)}
            >
              Last
            </Button>
            <label className="inline-flex items-center gap-2 text-xs text-[var(--color-muted)]">
              Page
              <input
                type="number"
                min={1}
                max={pageCount}
                value={currentPage}
                aria-label="Jump to page"
                onChange={(event) => {
                  const page = Math.min(pageCount, Math.max(1, Number(event.target.value) || 1));
                  setOffset((page - 1) * pageSize);
                }}
                className="w-16 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5"
              />
            </label>
          </div>
        </div>
      </div>

      <section aria-label="Directory controls" className="space-y-3 no-print">
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
          <Input
            type="search"
            aria-label="Search users"
            placeholder="Filter this page by name or email…"
            value={filters.query}
            onChange={(event) => applyFilters({ ...filters, query: event.target.value })}
            className="min-w-52 flex-1"
          />
          {(["all", "online", "offline"] as const).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filters.status === status}
              onClick={() => applyFilters({ ...filters, status })}
              className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors ${
                filters.status === status
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
              }`}
            >
              {status}
            </button>
          ))}
          <select
            aria-label="Filter by role"
            value={filters.roleId ?? 0}
            onChange={(event) => applyFilters({ ...filters, roleId: Number(event.target.value) })}
            className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs"
          >
            <option value={0}>All roles</option>
            {(roles.data ?? []).map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <Input
            type="date"
            aria-label="Registered from"
            title="Registered from"
            value={filters.registeredFrom ?? ""}
            onChange={(event) => applyFilters({ ...filters, registeredFrom: event.target.value })}
            className="w-auto"
          />
          <Input
            type="date"
            aria-label="Registered to"
            title="Registered to"
            min={filters.registeredFrom || undefined}
            value={filters.registeredTo ?? ""}
            onChange={(event) => applyFilters({ ...filters, registeredTo: event.target.value })}
            className="w-auto"
          />
          <label className="inline-flex items-center gap-2 text-xs text-[var(--color-muted)]">
            Rows
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(event) => {
                setOffset(0);
                setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
              }}
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-2"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            aria-pressed={liveEnabled}
            onClick={() => setLiveEnabled(!liveEnabled)}
            className={`inline-flex items-center gap-2 rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs ${
              liveEnabled ? "text-[var(--color-success)]" : "text-[var(--color-muted)]"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${realtime.connected ? "bg-[var(--color-success)]" : "bg-[var(--color-muted)]"}`}
            />
            Live {liveEnabled ? "on" : "off"}
          </button>
          <button
            type="button"
            aria-pressed={zebraRows}
            onClick={() => setZebraRows(!zebraRows)}
            className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs text-[var(--color-muted)]"
          >
            Zebra {zebraRows ? "on" : "off"}
          </button>
          <button
            type="button"
            aria-pressed={compactRows}
            onClick={() => setCompactRows(!compactRows)}
            className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs text-[var(--color-muted)]"
          >
            {compactRows ? "Compact" : "Comfortable"}
          </button>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs text-[var(--color-muted)]">
              Columns
            </summary>
            <div className="absolute right-0 top-full z-[var(--z-dropdown)] mt-2 w-52 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-2xl">
              {(Object.keys(DEFAULT_COLUMNS) as ColumnKey[]).map((key) => (
                <label key={key} className="flex items-center justify-between gap-3 py-1 text-xs capitalize">
                  {columnLabel(key)}
                  <input
                    type="checkbox"
                    checked={visibleColumns[key]}
                    onChange={(event) =>
                      setVisibleColumns({ ...visibleColumns, [key]: event.target.checked })
                    }
                    className="accent-[var(--color-accent)]"
                  />
                </label>
              ))}
            </div>
          </details>
          <Button variant="ghost" onClick={() => exportUsers("csv")}>
            Export CSV
          </Button>
          <Button variant="ghost" onClick={() => exportUsers("json")}>
            Export JSON
          </Button>
          <Button variant="ghost" disabled={importing} onClick={() => importRef.current?.click()}>
            {importing ? "Importing…" : "Import CSV"}
          </Button>
          <input
            ref={importRef}
            type="file"
            aria-label="Import users CSV"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importCsv(file);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Preset name"
            placeholder="Preset name"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            className="max-w-48"
          />
          <Button
            variant="ghost"
            disabled={!presetName.trim()}
            onClick={() => {
              const next = [
                ...presets.filter((preset) => preset.name !== presetName.trim()),
                { ...filters, name: presetName.trim() },
              ];
              setPresets(next);
              setPresetName("");
              toast("success", "Filter preset saved");
            }}
          >
            Save preset
          </Button>
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyFilters({ ...filters, ...preset })}
              className="rounded-lg border border-[var(--color-line)] px-2.5 py-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              {preset.name}
            </button>
          ))}
        </div>

        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-4 py-3">
            <strong className="text-sm">{formatNumber(selectedIds.size)} selected</strong>
            <Button variant="ghost" onClick={() => exportUsers("csv", selectedUsers)}>
              Export selection
            </Button>
            <select
              aria-label="Role for selected users"
              value={bulkRoleId}
              onChange={(event) => setBulkRoleId(Number(event.target.value))}
              className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-2 text-xs"
            >
              <option value={0}>Choose role…</option>
              {(roles.data ?? []).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              disabled={!bulkRoleId || bulkAssigning}
              onClick={() => void assignBulkRole()}
            >
              {bulkAssigning ? "Assigning…" : "Assign role"}
            </Button>
            <Button variant="danger" onClick={() => requestDelete(selectedUsers)}>
              Delete selection
            </Button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set<number>())}
              className="ml-auto text-xs text-[var(--color-muted)] underline"
            >
              Clear
            </button>
          </div>
        ) : null}
      </section>

      {/* directory table */}
      <Card title={`Users (${meta.total})`}>
        <div className="relative -mx-2 max-h-[60vh] overflow-auto" aria-busy={users.isFetching}>
          {users.isFetching ? (
            <div
              className="sticky left-0 top-0 z-[var(--z-dropdown)] flex h-1 w-full overflow-hidden"
              aria-label="Refreshing users"
            >
              <span className="w-full animate-pulse bg-[var(--color-accent)]" />
            </div>
          ) : null}
          <table
            className="w-full text-sm"
            aria-rowcount={items.length}
            style={{
              minWidth: Math.max(
                760,
                visibleKeys.reduce((totalWidth, key) => totalWidth + columnWidths[key], 0),
              ),
            }}
          >
            <caption className="sr-only" aria-live="polite">
              {items.length} of {meta.total} users shown
            </caption>
            <colgroup>
              {visibleKeys.map((key) => (
                <col key={key} style={{ width: columnWidths[key] }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-[var(--z-sticky)] bg-[var(--color-surface)]">
              <tr>
                {visibleColumns.select ? (
                  <ResizableHeader
                    column="select"
                    label="Select"
                    widths={columnWidths}
                    onResize={startResize}
                  >
                    <input
                      type="checkbox"
                      aria-label="Select all visible users"
                      checked={items.length > 0 && items.every((user) => selectedIds.has(user.id))}
                      onChange={(event) =>
                        setSelectedIds(
                          event.target.checked ? new Set(items.map((user) => user.id)) : new Set<number>(),
                        )
                      }
                      className="accent-[var(--color-accent)]"
                    />
                  </ResizableHeader>
                ) : null}
                {visibleColumns.id ? (
                  <ResizableHeader column="id" label="ID" widths={columnWidths} onResize={startResize} />
                ) : null}
                {visibleColumns.user ? (
                  <SortableHeader
                    column="user"
                    label="User"
                    field="displayName"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                    widths={columnWidths}
                    onResize={startResize}
                  />
                ) : null}
                {visibleColumns.email ? (
                  <SortableHeader
                    column="email"
                    label="Email"
                    field="email"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                    widths={columnWidths}
                    onResize={startResize}
                  />
                ) : null}
                {visibleColumns.role ? (
                  <ResizableHeader column="role" label="Roles" widths={columnWidths} onResize={startResize} />
                ) : null}
                {visibleColumns.status ? (
                  <ResizableHeader
                    column="status"
                    label="Status"
                    widths={columnWidths}
                    onResize={startResize}
                  />
                ) : null}
                {visibleColumns.lastLogin ? (
                  <SortableHeader
                    column="lastLogin"
                    label="Last login"
                    field="lastLoginAt"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                    widths={columnWidths}
                    onResize={startResize}
                  />
                ) : null}
                {visibleColumns.created ? (
                  <SortableHeader
                    column="created"
                    label="Created"
                    field="createdAt"
                    activeField={sortField}
                    direction={sortDirection}
                    onSort={toggleSort}
                    widths={columnWidths}
                    onResize={startResize}
                  />
                ) : null}
                {visibleColumns.ip ? (
                  <ResizableHeader column="ip" label="IP" widths={columnWidths} onResize={startResize} />
                ) : null}
                {visibleColumns.device ? (
                  <ResizableHeader
                    column="device"
                    label="Device"
                    widths={columnWidths}
                    onResize={startResize}
                  />
                ) : null}
                {visibleColumns.actions ? (
                  <ResizableHeader
                    column="actions"
                    label="Actions"
                    widths={columnWidths}
                    onResize={startResize}
                  />
                ) : null}
              </tr>
            </thead>
            <tbody>
              {items.map((u, index) => (
                <Fragment key={u.id}>
                  <tr
                    data-user-row={index}
                    tabIndex={index === activeRow ? 0 : -1}
                    aria-selected={selectedIds.has(u.id)}
                    onFocus={() => setActiveRow(index)}
                    onClick={() => openDetail(u)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetail(u);
                      }
                    }}
                    className={`ui-row cursor-pointer transition-colors hover:bg-[var(--color-hover)] focus:bg-[var(--color-hover)] ${selectedIds.has(u.id) ? "bg-[var(--color-selected)]" : ""} ${u.online ? "shadow-[inset_3px_0_var(--color-success)]" : ""} ${zebraRows ? "even:bg-[var(--color-elevated)]" : ""} ${compactRows ? "[&>td]:py-2" : ""} ${newUserId === u.id ? "animate-pulse bg-[var(--color-accent)]/10" : ""}`}
                  >
                    {visibleColumns.select ? (
                      <Td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${u.displayName || u.email}`}
                          checked={selectedIds.has(u.id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleSelected(u.id)}
                          className="accent-[var(--color-accent)]"
                        />
                      </Td>
                    ) : null}
                    {visibleColumns.id ? (
                      <Td>
                        <button
                          type="button"
                          title="Copy user ID"
                          onClick={(event) => {
                            event.stopPropagation();
                            void copyText(String(u.id), toast);
                          }}
                          className="font-mono text-xs text-[var(--color-muted)] hover:underline"
                        >
                          {String(u.id).slice(0, 10)}
                        </button>
                      </Td>
                    ) : null}
                    {visibleColumns.user ? (
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="relative">
                            <Avatar seed={u.id} label={u.displayName || u.email} alt="" />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 block size-2.5 rounded-full border-2 border-[var(--color-surface)] ${
                                u.online ? "bg-[var(--color-success)]" : "bg-[var(--color-muted)]"
                              }`}
                              title={
                                u.online
                                  ? `Online · ${u.activeSessions ?? 0} active sessions`
                                  : u.lastLoginAt
                                    ? `Offline · last seen ${relativeTime(u.lastLoginAt)}`
                                    : "Offline · never logged in"
                              }
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {u.displayName || (
                                <span className="text-[var(--color-muted)]">Unnamed user</span>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">
                              {u.email || "No email"}
                            </span>
                          </span>
                        </div>
                      </Td>
                    ) : null}
                    {visibleColumns.email ? (
                      <Td>
                        <span className="inline-flex items-center gap-2">
                          <a
                            href={`mailto:${u.email}`}
                            onClick={(event) => event.stopPropagation()}
                            className="hover:underline"
                          >
                            <ExpandableText text={u.email || "—"} max={28} />
                          </a>
                          <button
                            type="button"
                            title="Copy email"
                            aria-label={`Copy ${u.email}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              void copyText(u.email, toast);
                            }}
                            className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                          >
                            ⧉
                          </button>
                        </span>
                      </Td>
                    ) : null}
                    {visibleColumns.role ? (
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {(u.roles ?? []).length > 0 ? (
                            u.roles?.map((role) => (
                              <span
                                key={role.id}
                                className="rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]"
                              >
                                {role.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[var(--color-muted)]">No role</span>
                          )}
                        </div>
                      </Td>
                    ) : null}
                    {visibleColumns.status ? (
                      <Td>
                        {u.online ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
                            <span className="block size-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
                            Online
                            {u.activeSessions ? (
                              <span
                                title={`${u.activeSessions} active sessions`}
                                className="rounded-full bg-[var(--color-success)]/15 px-1.5 py-0.5 font-mono text-[10px]"
                              >
                                {u.activeSessions}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-muted)]">Offline</span>
                        )}
                      </Td>
                    ) : null}
                    {visibleColumns.lastLogin ? (
                      <Td>
                        {u.lastLoginAt ? (
                          <span
                            title={formatDateTime(u.lastLoginAt, timeZone)}
                            className="font-mono text-xs text-[var(--color-muted)]"
                          >
                            <span aria-hidden>◷ </span>
                            {relativeTime(u.lastLoginAt)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-[var(--color-muted)]">—</span>
                        )}
                      </Td>
                    ) : null}
                    {visibleColumns.created ? (
                      <Td>
                        {u.createdAt ? (
                          <span
                            title={formatDateTime(u.createdAt, timeZone)}
                            className="font-mono text-xs text-[var(--color-muted)]"
                          >
                            {relativeTime(u.createdAt)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-[var(--color-muted)]">—</span>
                        )}
                      </Td>
                    ) : null}
                    {visibleColumns.ip ? (
                      <Td>
                        <details
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          className="relative font-mono text-xs"
                        >
                          <summary className="cursor-pointer text-[var(--color-muted)]">
                            <ExpandableText text={u.lastLoginIp || "—"} max={22} />
                          </summary>
                          <p className="absolute z-[var(--z-dropdown)] mt-1 w-48 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-xl">
                            {ipDescription(u.lastLoginIp)}
                          </p>
                        </details>
                      </Td>
                    ) : null}
                    {visibleColumns.device ? (
                      <Td>
                        <span className="text-xs text-[var(--color-muted)]">
                          <span aria-hidden>{deviceIcon(u.lastLoginUserAgent)} </span>
                          <ExpandableText text={deviceLabel(u.lastLoginUserAgent)} max={22} />
                        </span>
                      </Td>
                    ) : null}
                    {visibleColumns.actions ? (
                      <Td className="sticky right-0 z-[var(--z-sticky)] bg-[var(--color-surface)]">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            title={`Expand ${u.displayName || u.email}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedIds((current) => {
                                const next = new Set(current);
                                if (next.has(u.id)) next.delete(u.id);
                                else next.add(u.id);
                                return next;
                              });
                            }}
                          >
                            {expandedIds.has(u.id) ? "Collapse" : "Expand"}
                          </Button>
                          <Button
                            variant="ghost"
                            title={`View audit trail for ${u.displayName || u.email}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openDetail(u);
                            }}
                          >
                            Audit
                          </Button>
                          <Button
                            variant="ghost"
                            title={`Edit ${u.displayName || u.email}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditing(u);
                            }}
                          >
                            <PencilSimple size={14} />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            title={`Duplicate ${u.displayName || u.email}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setRegisterSeed(u);
                              setRegistering(true);
                            }}
                          >
                            Duplicate
                          </Button>
                          <Button
                            variant="danger"
                            title={`Delete ${u.displayName || u.email}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              void requestDelete([u]);
                            }}
                            disabled={remove.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </Td>
                    ) : null}
                  </tr>
                  {expandedIds.has(u.id) ? (
                    <tr>
                      <td
                        colSpan={Math.max(1, visibleKeys.length)}
                        className="border-t border-[var(--color-line)] bg-[var(--color-elevated)] px-6 py-4"
                      >
                        <UserQuickDetail user={u} timeZone={timeZone} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, visibleKeys.length)}
                    className="border-t border-[var(--color-line)] px-4 py-8"
                  >
                    <div className="flex flex-col items-center gap-2 py-8 text-center text-[var(--color-muted)]">
                      <svg
                        viewBox="0 0 64 64"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="size-12 opacity-50"
                        aria-hidden
                        focusable="false"
                      >
                        <title>empty</title>
                        <circle cx="32" cy="24" r="10" />
                        <path d="M10 54c2-12 12-18 22-18s20 6 22 18" />
                      </svg>
                      <p className="text-sm">No profiles yet — they appear when users register.</p>
                      <Button onClick={() => setRegistering(true)} className="mt-1">
                        Register the first user
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <ActivityFeed items={activity} />

      {registering ? (
        <RegisterUserModal
          initialProfile={registerSeed}
          onClose={() => setRegistering(false)}
          onSaved={(id) => {
            setRegistering(false);
            setNewUserId(id);
            window.setTimeout(() => setNewUserId(null), 4_000);
            refresh();
            realtime.broadcast("create");
            addActivity("User registered");
            toast("success", "User registered");
          }}
        />
      ) : null}
      {editing ? (
        <ProfileModal
          title="Edit user"
          profile={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
            realtime.broadcast("update");
            addActivity(`User ${editing?.displayName || editing?.email || "profile"} updated`);
            toast("success", `Profile ${editing?.displayName || editing?.email || "user"} updated`);
          }}
        />
      ) : null}
    </div>
  );
}

function columnLabel(key: ColumnKey): string {
  const labels: Record<ColumnKey, string> = {
    select: "selection",
    id: "ID",
    user: "user",
    email: "email",
    role: "roles",
    status: "status",
    lastLogin: "last login",
    created: "created",
    ip: "IP address",
    device: "device",
    actions: "actions",
  };
  return labels[key];
}

function ResizableHeader({
  column,
  label,
  widths,
  onResize,
  children,
}: {
  column: ColumnKey;
  label: string;
  widths: Record<ColumnKey, number>;
  onResize(column: ColumnKey, event: ReactPointerEvent): void;
  children?: ReactNode;
}) {
  return (
    <th
      className={`relative px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted)] ${column === "actions" ? "sticky right-0 z-[var(--z-hover)] bg-[var(--color-surface)]" : ""}`}
    >
      {children ?? label}
      <span
        role="separator"
        tabIndex={0}
        aria-label={`Resize ${label} column`}
        aria-orientation="vertical"
        aria-valuenow={widths[column]}
        title={`${widths[column]}px`}
        onPointerDown={(event) => onResize(column, event)}
        className="absolute inset-y-1 right-0 w-1 cursor-col-resize rounded bg-transparent hover:bg-[var(--color-accent)]/50"
      />
    </th>
  );
}

function SortableHeader({
  column,
  label,
  field,
  activeField,
  direction,
  onSort,
  widths,
  onResize,
}: {
  column: ColumnKey;
  label: string;
  field: SortField;
  activeField: SortField;
  direction: SortDirection;
  onSort(field: SortField): void;
  widths: Record<ColumnKey, number>;
  onResize(column: ColumnKey, event: ReactPointerEvent): void;
}) {
  const active = activeField === field;
  return (
    <ResizableHeader column={column} label={label} widths={widths} onResize={onResize}>
      <button
        type="button"
        onClick={() => onSort(field)}
        aria-label={`Sort by ${label}`}
        className="inline-flex items-center gap-1.5 hover:text-[var(--color-ink)]"
      >
        {label}
        <span aria-hidden className={active ? "text-[var(--color-accent)]" : "opacity-30"}>
          {active && direction === "desc" ? "↓" : "↑"}
        </span>
      </button>
    </ResizableHeader>
  );
}

function UserQuickDetail({ user, timeZone }: { user: Profile; timeZone: string }) {
  return (
    <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
      <DetailRow label="Email" value={user.email} />
      <DetailRow label="Roles" value={(user.roles ?? []).map((role) => role.name).join(", ") || "No role"} />
      <DetailRow label="Sessions" value={formatNumber(user.activeSessions ?? 0)} />
      <DetailRow label="Created" value={user.createdAt ? formatDateTime(user.createdAt, timeZone) : "—"} />
    </dl>
  );
}

function UserDetail({ user, timeZone }: { user: Profile; timeZone: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [roleIds, setRoleIds] = useState(() => (user.roles ?? []).map((role) => role.id));
  const allRoles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/roles");
      if (error) throw new Error("failed to load roles");
      return (data?.data as { items?: { id: number; name: string }[] })?.items ?? [];
    },
  });
  const sessions = useQuery({
    queryKey: ["user", user.id, "sessions"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/auth/users/{id}/sessions", {
        params: { path: { id: user.id } },
      });
      if (error) throw new Error("failed to load sessions");
      return (
        (
          data?.data as {
            items?: Array<{ id: number; userAgent: string; ip: string; createdAt: string }>;
          }
        )?.items ?? []
      );
    },
  });
  const audit = useQuery({
    queryKey: ["user", user.id, "audit"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/audit/viewer", {
        params: { query: { limit: 20, offset: 0, entityId: String(user.id) } },
      });
      if (error) throw new Error("failed to load audit history");
      return (
        (
          data?.data as {
            items?: Array<{ id: number; action: string; actorSub: string; createdAt: string }>;
          }
        )?.items ?? []
      );
    },
  });
  const changed = () => {
    void queryClient.invalidateQueries({ queryKey: ["users"] });
    void queryClient.invalidateQueries({ queryKey: ["user", user.id] });
  };
  const state = useMutation({
    mutationFn: async (body: { status?: "active" | "inactive"; locked?: boolean }) => {
      const { error } = await api.PATCH("/api/v1/auth/users/{id}/state", {
        params: { path: { id: user.id } },
        body,
      });
      if (error) throw new Error("failed to update account state");
    },
    onSuccess: () => {
      changed();
      toast("success", `Account ${user.displayName || user.email} updated`);
    },
    onError: (error) => toast("error", (error as Error).message),
  });
  const revoke = useMutation({
    mutationFn: async (sessionId?: number) => {
      const result = sessionId
        ? await api.DELETE("/api/v1/auth/users/{id}/sessions/{sessionId}", {
            params: { path: { id: user.id, sessionId } },
          })
        : await api.DELETE("/api/v1/auth/users/{id}/sessions", {
            params: { path: { id: user.id } },
          });
      if (result.error) throw new Error("failed to revoke sessions");
    },
    onSuccess: () => {
      void sessions.refetch();
      changed();
      toast("success", `Sessions for ${user.displayName || user.email} revoked`);
    },
    onError: (error) => toast("error", (error as Error).message),
  });
  const saveRoles = useMutation({
    mutationFn: async () => {
      const { error } = await api.PUT("/api/v1/rbac/users/{id}/roles", {
        params: { path: { id: user.id } },
        body: { roleIds },
      });
      if (error) throw new Error("failed to update roles");
    },
    onSuccess: () => {
      changed();
      toast("success", `Roles for ${user.displayName || user.email} updated`);
    },
    onError: (error) => toast("error", (error as Error).message),
  });

  return (
    <div className="space-y-6 text-sm">
      <dl className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar seed={user.id} label={user.displayName || user.email} alt="" />
          <div className="min-w-0">
            <dt className="sr-only">Name</dt>
            <dd className="truncate font-semibold">{user.displayName || "Unnamed user"}</dd>
            <dd className="truncate text-xs text-[var(--color-muted)]">{user.email}</dd>
          </div>
        </div>
        <DetailRow label="Status" value={user.online ? "Online" : "Offline"} />
        <DetailRow
          label="Account"
          value={`${user.status ?? "active"}${user.lockedUntil && new Date(user.lockedUntil) > new Date() ? " · locked" : ""}`}
        />
        <DetailRow label="Active sessions" value={formatNumber(user.activeSessions ?? 0)} />
        <DetailRow
          label="Last login"
          value={user.lastLoginAt ? formatDateTime(user.lastLoginAt, timeZone) : "Never"}
        />
        <DetailRow label="IP address" value={user.lastLoginIp || "—"} />
        <DetailRow label="Device" value={deviceLabel(user.lastLoginUserAgent)} />
        <DetailRow label="Created" value={user.createdAt ? formatDateTime(user.createdAt, timeZone) : "—"} />
        <DetailRow label="Updated" value={user.updatedAt ? formatDateTime(user.updatedAt, timeZone) : "—"} />
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">ID</dt>
          <dd className="mt-1 flex items-center gap-2 break-all font-mono text-xs">
            {user.id}
            <button type="button" className="underline" onClick={() => void copyText(String(user.id), toast)}>
              Copy
            </button>
          </dd>
        </div>
      </dl>

      <section>
        <h4 className="font-semibold">Account controls</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="ghost"
            disabled={state.isPending}
            onClick={() => state.mutate({ status: user.status === "inactive" ? "active" : "inactive" })}
          >
            {user.status === "inactive" ? "Activate" : "Deactivate"}
          </Button>
          <Button
            variant="ghost"
            disabled={state.isPending}
            onClick={() =>
              state.mutate({ locked: !(user.lockedUntil && new Date(user.lockedUntil) > new Date()) })
            }
          >
            {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? "Unlock" : "Lock"}
          </Button>
          <Button variant="danger" disabled={revoke.isPending} onClick={() => revoke.mutate(undefined)}>
            Force logout
          </Button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold">Assigned roles</h4>
          <Button variant="ghost" disabled={saveRoles.isPending} onClick={() => saveRoles.mutate()}>
            Save roles
          </Button>
        </div>
        <div className="mt-2 space-y-1">
          {(allRoles.data ?? []).map((role) => (
            <label key={role.id} className="ui-choice">
              <input
                type="checkbox"
                checked={roleIds.includes(role.id)}
                onChange={() =>
                  setRoleIds((current) =>
                    current.includes(role.id)
                      ? current.filter((id) => id !== role.id)
                      : [...current, role.id],
                  )
                }
              />
              {role.name}
            </label>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-semibold">Active sessions</h4>
          <span className="font-mono text-xs text-[var(--color-muted)]">{sessions.data?.length ?? 0}</span>
        </div>
        <ul className="mt-2 space-y-2">
          {(sessions.data ?? []).map((session) => (
            <li key={session.id} className="rounded-lg border border-[var(--color-line)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p>{deviceLabel(session.userAgent)}</p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--color-muted)]">
                    {session.ip || "Unknown IP"} · {formatDateTime(session.createdAt, timeZone)}
                  </p>
                </div>
                <Button
                  variant="danger"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(session.id)}
                >
                  Revoke
                </Button>
              </div>
            </li>
          ))}
          {sessions.isPending ? <li className="text-[var(--color-muted)]">Loading sessions…</li> : null}
          {sessions.data?.length === 0 ? (
            <li className="text-[var(--color-muted)]">No active sessions.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <h4 className="font-semibold">Audit history</h4>
        <ol className="mt-2 space-y-2">
          {(audit.data ?? []).map((entry) => (
            <li key={entry.id} className="border-l-2 border-[var(--color-line)] pl-3">
              <p className="capitalize">{entry.action}</p>
              <time className="font-mono text-[10px] text-[var(--color-muted)]">
                {formatDateTime(entry.createdAt, timeZone)} · {entry.actorSub || "system"}
              </time>
            </li>
          ))}
          {audit.isPending ? <li className="text-[var(--color-muted)]">Loading audit history…</li> : null}
          {audit.data?.length === 0 ? <li className="text-[var(--color-muted)]">No audit entries.</li> : null}
        </ol>
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}

function RegistrationSparkline({ values }: { values: Array<{ day: string; count: number }> }) {
  if (values.length === 0) return null;
  const max = Math.max(1, ...values.map((item) => item.count));
  const points = values
    .map((item, index) => `${(index / Math.max(1, values.length - 1)) * 120},${28 - (item.count / max) * 24}`)
    .join(" ");
  return (
    <svg
      viewBox="0 0 120 32"
      role="img"
      aria-label={`Registrations over seven days: ${values.map((item) => item.count).join(", ")}`}
      className="mt-3 h-8 w-32 text-[var(--color-accent)]"
    >
      <title>Seven-day registration trend</title>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <aside
      aria-label="Recent activity"
      className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Recent activity</h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
          this tab
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Mutations and live invalidations will appear here.
        </p>
      ) : (
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg bg-[var(--color-elevated)] px-3 py-2 text-xs">
              <span className="block text-[var(--color-ink)]">{item.label}</span>
              <time className="font-mono text-[10px] text-[var(--color-muted)]">{relativeTime(item.at)}</time>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(
  source: string,
): Array<{ email: string; password: string; displayName: string; avatarUrl: string }> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' && quoted && source[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  const [headers = [], ...data] = rows;
  const indexOf = (name: string) =>
    headers.findIndex((header) => header.toLowerCase() === name.toLowerCase());
  return data.map((values) => ({
    email: values[indexOf("email")] ?? "",
    password: values[indexOf("password")] ?? "",
    displayName: values[indexOf("displayName")] ?? "",
    avatarUrl: values[indexOf("avatarUrl")] ?? "",
  }));
}

function useRealtimeUsers(enabled: boolean, onInvalidate: () => void, onActivity: (label: string) => void) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const clientId = useRef(globalThis.crypto?.randomUUID?.() ?? String(Math.random())).current;

  useEffect(() => {
    if (!enabled || typeof WebSocket === "undefined") {
      setConnected(false);
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    let disposed = false;
    let retry: number | undefined;
    let attempts = 0;
    const connect = () => {
      const url = new URL("/ws", GATEWAY_URL || window.location.origin);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(url, ["jwt", token]);
      socketRef.current = socket;
      socket.addEventListener("open", () => {
        attempts = 0;
        setConnected(true);
        socket.send(JSON.stringify({ type: "room:join", room: "lobby" }));
      });
      socket.addEventListener("message", (event) => {
        try {
          const frame = JSON.parse(String(event.data)) as { type?: string; text?: string };
          if (frame.type !== "message" || !frame.text) return;
          const payload = JSON.parse(frame.text) as {
            type?: string;
            resource?: string;
            origin?: string;
            action?: string;
          };
          if (payload.type === "invalidate" && payload.resource === "users" && payload.origin !== clientId) {
            onInvalidate();
            onActivity(`Live update: ${payload.action ?? "users changed"}`);
          }
        } catch {
          // Non-invalidation room messages are intentionally ignored.
        }
      });
      socket.addEventListener("close", () => {
        setConnected(false);
        if (!disposed) {
          const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempts++, 5)) + Math.random() * 500;
          retry = window.setTimeout(connect, delay);
        }
      });
      socket.addEventListener("error", () => socket.close());
    };
    connect();
    return () => {
      disposed = true;
      if (retry) window.clearTimeout(retry);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, clientId, onActivity, onInvalidate]);

  const broadcast = useCallback(
    (action: string) => {
      const socket = socketRef.current;
      if (!enabled || socket?.readyState !== WebSocket.OPEN) return;
      socket.send(
        JSON.stringify({
          type: "message:send",
          room: "lobby",
          text: JSON.stringify({ type: "invalidate", resource: "users", action, origin: clientId }),
        }),
      );
    },
    [clientId, enabled],
  );
  return { connected, broadcast };
}

function ProfileModal({
  title,
  profile,
  onClose,
  onSaved,
}: {
  title: string;
  profile: Profile;
  onClose(): void;
  onSaved(): void;
}) {
  const [email, setEmail] = useState(profile.email);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const confirm = useConfirm();
  const history = useQuery({
    queryKey: ["user", profile.id, "audit"],
    queryFn: async () => {
      const { data, error: historyError } = await api.GET("/api/v1/audit/viewer", {
        params: { query: { limit: 10, offset: 0, entityId: String(profile.id) } },
      });
      if (historyError) throw new Error("failed to load change history");
      return (
        (data?.data as { items?: Array<{ id: number; action: string; createdAt: string }> })?.items ?? []
      );
    },
  });
  const emailChanged = email.trim().toLowerCase() !== profile.email.trim().toLowerCase();
  const dirty =
    email !== profile.email ||
    displayName !== profile.displayName ||
    avatarUrl !== profile.avatarUrl ||
    newPassword !== "";
  const requestClose = async () => {
    if (!dirty || (await confirm("Discard unsaved changes?", "Your edits will not be saved."))) onClose();
  };

  const save = useMutation({
    mutationFn: async () => {
      if (emailChanged) {
        const confirmation = await api.POST("/api/v1/auth/confirm-password", {
          body: { password: adminPassword },
        });
        if (confirmation.error) throw new Error("Your password could not be confirmed.");
      }
      const { error: e } = await api.PATCH("/api/v1/users/{id}", {
        params: { path: { id: profile.id } },
        body: { id: profile.id, email, displayName, avatarUrl },
      });
      if (e) throw new Error((e as { message?: string }).message ?? "update failed");

      if (newPassword) {
        const { error: pe } = await api.POST("/api/v1/auth/users/{id}/password", {
          params: { path: { id: profile.id } },
          body: { newPassword },
        });
        if (pe) throw new Error((pe as { message?: string }).message ?? "password reset failed");
      }
    },
    onSuccess: onSaved,
    onError: (err) => {
      const msg = (err as Error).message;
      setError(msg.includes("already in use") ? "That email is already in use." : msg);
    },
  });

  const sendReset = useMutation({
    mutationFn: async () => {
      const { error: resetError } = await api.POST("/api/v1/auth/forgot", { body: { email } });
      if (resetError) throw new Error("could not send password reset email");
    },
    onSuccess: () => toast("success", `Password reset email queued for ${email}`),
    onError: (resetError) => toast("error", (resetError as Error).message),
  });

  return (
    <Modal
      title={title}
      eyebrow="Edit resource"
      description="Update the profile identity and optionally rotate the user's password."
      size="lg"
      onClose={requestClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="ui-modal-form"
      >
        <ModalSection
          title="Profile image"
          description="Use a square image URL; a fallback initial is always available."
        >
          <AvatarEditor
            avatarUrl={avatarUrl}
            avatarBroken={avatarBroken}
            fallback={displayName || email}
            label="Avatar URL"
            onBroken={setAvatarBroken}
            onChange={setAvatarUrl}
          />
        </ModalSection>

        <ModalSection
          title="Identity"
          description="These values appear throughout the directory and audit surfaces."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              <Input
                autoFocus
                name="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How the user is shown"
                maxLength={120}
              />
            </Field>
            <Field label="Email">
              <Input
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={error.includes("already in use")}
              />
            </Field>
          </div>
          {emailChanged ? (
            <div className="mt-4 space-y-2">
              <Alert message="Changing this address also changes the user's login email." />
              <Field label="Confirm your password">
                <Input
                  name="adminPassword"
                  type="password"
                  autoComplete="current-password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  required
                />
              </Field>
            </div>
          ) : null}
        </ModalSection>

        <ModalSection
          title="Credentials"
          description="Leave this blank to keep the current password. A new password revokes active sessions."
        >
          <Field label="New password">
            <div className="flex gap-2">
              <Input
                name="newPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button type="button" variant="ghost" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? "Hide" : "Show"}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => setNewPassword(randomPassword())}>
                Generate
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!newPassword}
                onClick={() => void copyText(newPassword, toast)}
              >
                Copy
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={sendReset.isPending}
                onClick={() => sendReset.mutate()}
              >
                Send reset email
              </Button>
            </div>
          </Field>
        </ModalSection>

        <ModalSection title="Change history" description="Recent audit entries for this user.">
          <ol className="space-y-2">
            {(history.data ?? []).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="capitalize">{entry.action}</span>
                <time className="font-mono text-[10px] text-[var(--color-muted)]">
                  {formatDateTime(entry.createdAt)}
                </time>
              </li>
            ))}
            {history.isPending ? (
              <li className="text-xs text-[var(--color-muted)]">Loading history…</li>
            ) : null}
            {history.data?.length === 0 ? (
              <li className="text-xs text-[var(--color-muted)]">No changes yet.</li>
            ) : null}
          </ol>
        </ModalSection>

        <p className="font-mono text-[10px] text-[var(--color-muted)]">
          Created {profile.createdAt ? formatDateTime(profile.createdAt) : "—"} · Updated{" "}
          {profile.updatedAt ? formatDateTime(profile.updatedAt) : "—"}
        </p>

        {error ? <Alert message={error} /> : null}
        <ModalActions>
          <Button type="button" variant="ghost" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending || (emailChanged && !adminPassword)}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function RegisterUserModal({
  initialProfile,
  onClose,
  onSaved,
}: {
  initialProfile: Profile | null;
  onClose(): void;
  onSaved(id: number): void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(initialProfile?.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatarUrl ?? "");
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [roleIds, setRoleIds] = useState<number[]>(() =>
    (initialProfile?.roles ?? []).map((role) => role.id),
  );
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roleQuery, setRoleQuery] = useState("");
  const toast = useToast();
  const deferredEmail = useDebouncedValue(email.trim().toLowerCase(), 300);

  // Same normalized shape as the roles page (shared ["roles"] cache entry).
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/roles");
      if (error) throw new Error("failed to load roles");
      return (data?.data as { items?: { id: number; name: string }[] })?.items ?? [];
    },
  });

  const emailCheck = useQuery({
    queryKey: ["users", "email-check", deferredEmail],
    enabled: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(deferredEmail),
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/users", {
        params: { query: { limit: 10, offset: 0, q: deferredEmail } },
      });
      if (error) throw new Error("email check failed");
      const items = (data?.data as { items?: Profile[] })?.items ?? [];
      return items.some((user) => user.email.toLowerCase() === deferredEmail);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const reg = await api.POST("/api/v1/auth/register", { body: { email, password } });
      if (reg.error) throw new Error((reg.error as { message?: string }).message ?? "registration failed");
      const newId = (reg.data?.data as { id: number }).id;

      if (displayName || avatarUrl) {
        const { error: e } = await api.PATCH("/api/v1/users/{id}", {
          params: { path: { id: newId } },
          body: { id: newId, displayName, avatarUrl },
        });
        if (e) throw new Error("registered, but saving profile failed");
      }
      if (roleIds.length > 0) {
        const { error: e } = await api.PUT("/api/v1/rbac/users/{id}/roles", {
          params: { path: { id: newId } },
          body: { roleIds },
        });
        if (e) throw new Error("registered, but assigning roles failed");
      }
      return newId;
    },
    onSuccess: onSaved,
    onError: (err) => setError((err as Error).message),
  });

  const toggleRole = (id: number) =>
    setRoleIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Modal
      title={initialProfile ? "Duplicate user" : "Register user"}
      eyebrow="Create resource"
      description="Create credentials, complete the profile, and assign initial access in one flow."
      size="lg"
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="ui-modal-form"
      >
        <ModalSection
          title="Profile image"
          description="Optional. You can add or change this after registration."
        >
          <AvatarEditor
            avatarUrl={avatarUrl}
            avatarBroken={avatarBroken}
            fallback={displayName || email}
            label="Avatar URL (optional)"
            onBroken={setAvatarBroken}
            onChange={setAvatarUrl}
          />
        </ModalSection>

        <ModalSection
          title="Identity and login"
          description="The email becomes the login identifier for this account."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              <Input
                name="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How the user is shown"
                maxLength={120}
              />
            </Field>
            <Field label="Email">
              <Input
                autoFocus
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={emailCheck.data === true}
              />
            </Field>
            {emailCheck.isFetching ? (
              <p className="text-xs text-[var(--color-muted)]">Checking email…</p>
            ) : null}
            {emailCheck.data ? <Alert message="That email is already registered." /> : null}
          </div>
          <div className="mt-4">
            <Field label="Temporary password">
              <div className="flex gap-2">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type="button" variant="ghost" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setPassword(randomPassword())}>
                  Generate
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!password}
                  onClick={() => void copyText(password, toast)}
                >
                  Copy
                </Button>
              </div>
            </Field>
          </div>
        </ModalSection>

        <ModalSection
          title="Initial access"
          description="Assign one or more roles now, or leave access empty for later."
        >
          <fieldset>
            <legend className="sr-only">Assigned roles</legend>
            <Input
              type="search"
              aria-label="Search roles"
              placeholder="Search roles…"
              value={roleQuery}
              onChange={(event) => setRoleQuery(event.target.value)}
              className="mb-2"
            />
            <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2">
              {roles.isPending ? (
                <div className="flex items-center gap-2 px-2 py-3 text-xs text-[var(--color-muted)]">
                  <Spinner /> Loading roles…
                </div>
              ) : null}
              {(roles.data ?? [])
                .filter((role) => role.name.toLowerCase().includes(roleQuery.trim().toLowerCase()))
                .map((r) => (
                  <label key={r.id} className="ui-choice">
                    <input
                      type="checkbox"
                      checked={roleIds.includes(r.id)}
                      onChange={() => toggleRole(r.id)}
                      className="size-3.5 accent-[var(--color-accent)]"
                    />
                    <span>{r.name}</span>
                  </label>
                ))}
              {roles.data !== undefined && roles.data.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[var(--color-muted)]">No roles available yet.</p>
              ) : null}
            </div>
          </fieldset>
        </ModalSection>

        {error ? <Alert message={error} /> : null}
        <p className="text-xs text-[var(--color-muted)]">
          The ID is assigned automatically. Share the temporary password with the user so they can log in and
          change it.
        </p>
        <ModalActions>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={save.isPending || !email || password.length < 8 || emailCheck.data === true}
          >
            {save.isPending ? "Registering…" : "Register user"}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function AvatarEditor({
  avatarUrl,
  avatarBroken,
  fallback,
  label,
  onBroken,
  onChange,
}: {
  avatarUrl: string;
  avatarBroken: boolean;
  fallback: string;
  label: string;
  onBroken(value: boolean): void;
  onChange(value: string): void;
}) {
  return (
    <div className="flex items-center gap-4">
      {avatarUrl && !avatarBroken ? (
        <img
          src={avatarUrl}
          width="64"
          height="64"
          alt="Avatar preview"
          onError={() => onBroken(true)}
          className="size-16 shrink-0 rounded-2xl border border-[var(--color-line)] object-cover grayscale"
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] bg-[var(--color-surface)] text-lg font-bold text-[var(--color-muted)]">
          {(fallback || "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Field label={label}>
          <Input
            name="avatarUrl"
            type="url"
            value={avatarUrl}
            onChange={(e) => {
              onChange(e.target.value);
              onBroken(false);
            }}
            placeholder="https://…"
          />
        </Field>
      </div>
    </div>
  );
}
