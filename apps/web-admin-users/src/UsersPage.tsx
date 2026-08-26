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
  online?: boolean;
  activeSessions?: number;
  lastLoginAt?: string | null;
  lastLoginIp?: string;
  lastLoginUserAgent?: string;
}

interface ListMeta {
  limit: number;
  offset: number;
  total: number;
}

const LIMIT = 20;

type SortField = "createdAt" | "displayName" | "email" | "lastLoginAt";
type SortDirection = "asc" | "desc";
type ColumnKey = "select" | "user" | "email" | "status" | "lastLogin" | "ip" | "device" | "actions";

interface UserFilters {
  query: string;
  status: "all" | "online" | "offline";
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
  user: true,
  email: false,
  status: true,
  lastLogin: true,
  ip: false,
  device: true,
  actions: true,
};

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  select: 48,
  user: 300,
  email: 250,
  status: 100,
  lastLogin: 140,
  ip: 150,
  device: 170,
  actions: 170,
};

/** Compact browser-os label from a raw User-Agent string. */
function deviceLabel(ua?: string): string {
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

/** Query keys follow docs/QUERY_KEYS.md: ['users', filters], ['user', id]. */
export default function UsersPage() {
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [registering, setRegistering] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [activeRow, setActiveRow] = useState(0);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(() => new Set());
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [presetName, setPresetName] = useState("");
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const drawer = useDrawer();
  const pageVisible = usePageVisible();
  const { userKey, timeZone } = usePreferences();
  const [filters, setFilters] = useStored<UserFilters>(`users-filters:${userKey}`, {
    query: "",
    status: "all",
  });
  const [presets, setPresets] = useStored<FilterPreset[]>(`users-filter-presets:${userKey}`, []);
  const [visibleColumns, setVisibleColumns] = useStored<Record<ColumnKey, boolean>>(
    `users-columns:v2:${userKey}`,
    DEFAULT_COLUMNS,
  );
  const [columnWidths, setColumnWidths] = useStored<Record<ColumnKey, number>>(
    `users-column-widths:v2:${userKey}`,
    DEFAULT_WIDTHS,
  );
  const [liveEnabled, setLiveEnabled] = useStored(`users-live:${userKey}`, true);
  const importRef = useRef<HTMLInputElement>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);

  const users = useQuery({
    queryKey: ["users", { limit: LIMIT, offset, sort: sortField, order: sortDirection }],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/users", {
        params: { query: { limit: LIMIT, offset, sort: sortField, order: sortDirection } },
      });
      if (error) throw new Error((error as { message?: string }).message ?? "failed to load users");
      return (data?.data ?? { items: [], meta: { limit: LIMIT, offset: 0, total: 0 } }) as {
        items: Profile[];
        meta: ListMeta;
      };
    },
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
  }, [queryClient]);
  const realtime = useRealtimeUsers(liveEnabled, invalidateUsers, addActivity);

  const total = users.data?.meta.total ?? 0;

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

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const remove = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(
        ids.map(async (id) => {
          const { error } = await api.DELETE("/api/v1/users/{id}", { params: { path: { id } } });
          if (error) throw new Error(`delete failed for user ${id}`);
        }),
      );
      return ids;
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
    onError: (err) => {
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
  const items = queryItems.filter((user) => {
    if (pendingDeleteIds.has(user.id)) return false;
    const needle = filters.query.trim().toLowerCase();
    if (needle && !`${user.displayName} ${user.email}`.toLowerCase().includes(needle)) return false;
    if (filters.status === "online" && !user.online) return false;
    if (filters.status === "offline" && user.online) return false;
    return true;
  });

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
  const pageCount = Math.max(1, Math.ceil(meta.total / LIMIT));
  const currentPage = Math.floor(offset / LIMIT) + 1;
  const visibleKeys = (Object.keys(visibleColumns) as ColumnKey[]).filter((key) => visibleColumns[key]);
  const selectedUsers = items.filter((user) => selectedIds.has(user.id));

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
        className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-2 lg:auto-flow-dense lg:grid-cols-6"
      >
        <div className="ui-card min-h-40 rounded-none border-0 sm:col-span-2 sm:min-h-52 lg:col-span-4 lg:row-span-2">
          <Stat
            label="Profiles on record"
            value={<span ref={countRef}>0</span>}
            hint={`showing ${items.length} on this page · ${pageCount} page${pageCount > 1 ? "s" : ""}`}
          />
        </div>

        <div className="relative min-h-40 overflow-hidden sm:min-h-52 lg:col-span-2 lg:row-span-2 lg:min-h-[220px]">
          <img
            data-art
            src="https://picsum.photos/seed/directory-noir/900/900"
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
              <Avatar seed={newest.id} alt="" />
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
              <Button onClick={() => setRegistering(true)} className="mt-2 w-full">
                New user
              </Button>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6 lg:col-span-2">
          <span className="font-mono text-xs text-[var(--color-muted)]">
            page {currentPage} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              disabled={offset + LIMIT >= meta.total}
              onClick={() => setOffset(offset + LIMIT)}
            >
              Next
              <ArrowRight size={14} weight="bold" />
            </Button>
          </div>
        </div>
      </div>

      <section aria-label="Directory controls" className="space-y-3 no-print">
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
          <Input
            type="search"
            aria-label="Filter users"
            placeholder="Filter this page by name or email…"
            value={filters.query}
            onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            className="min-w-52 flex-1"
          />
          {(["all", "online", "offline"] as const).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filters.status === status}
              onClick={() => setFilters({ ...filters, status })}
              className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors ${
                filters.status === status
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
              }`}
            >
              {status}
            </button>
          ))}
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
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg border border-[var(--color-line)] px-3 py-2 text-xs text-[var(--color-muted)]">
              Columns
            </summary>
            <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-2xl">
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
              onClick={() => setFilters({ query: preset.query, status: preset.status })}
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
        <div className="-mx-2 max-h-[60vh] overflow-auto">
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
            <thead className="sticky top-0 z-10 bg-[var(--color-surface)]">
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
                <tr
                  key={u.id}
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
                  className={`ui-row cursor-pointer transition-colors hover:bg-[var(--color-hover)] focus:bg-[var(--color-hover)] ${selectedIds.has(u.id) ? "bg-[var(--color-selected)]" : ""}`}
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
                  {visibleColumns.user ? (
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="relative">
                          <Avatar seed={u.id} alt="" />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 block size-2.5 rounded-full border-2 border-[var(--color-surface)] ${
                              u.online ? "bg-[var(--color-success)]" : "bg-[var(--color-muted)]"
                            }`}
                            title={u.online ? "Online" : "Offline"}
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {u.displayName || <span className="text-[var(--color-muted)]">Unnamed user</span>}
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
                      <ExpandableText text={u.email || "—"} max={28} />
                    </Td>
                  ) : null}
                  {visibleColumns.status ? (
                    <Td>
                      {u.online ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
                          <span className="block size-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
                          Online
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
                          {relativeTime(u.lastLoginAt)}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-[var(--color-muted)]">—</span>
                      )}
                    </Td>
                  ) : null}
                  {visibleColumns.ip ? (
                    <Td>
                      <span className="font-mono text-xs text-[var(--color-muted)]">
                        <ExpandableText text={u.lastLoginIp || "—"} max={22} />
                      </span>
                    </Td>
                  ) : null}
                  {visibleColumns.device ? (
                    <Td>
                      <span className="text-xs text-[var(--color-muted)]">
                        <ExpandableText text={deviceLabel(u.lastLoginUserAgent)} max={22} />
                      </span>
                    </Td>
                  ) : null}
                  {visibleColumns.actions ? (
                    <Td>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditing(u);
                          }}
                        >
                          <PencilSimple size={14} />
                          Edit
                        </Button>
                        <Button
                          variant="danger"
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
          onClose={() => setRegistering(false)}
          onSaved={() => {
            setRegistering(false);
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
            toast("success", "User updated");
          }}
        />
      ) : null}
    </div>
  );
}

function columnLabel(key: ColumnKey): string {
  const labels: Record<ColumnKey, string> = {
    select: "selection",
    user: "user",
    email: "email",
    status: "status",
    lastLogin: "last login",
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
    <th className="relative px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
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

function UserDetail({ user, timeZone }: { user: Profile; timeZone: string }) {
  return (
    <dl className="space-y-4 text-sm">
      <div className="flex items-center gap-3">
        <Avatar seed={user.id} alt="" />
        <div className="min-w-0">
          <dt className="sr-only">Name</dt>
          <dd className="truncate font-semibold">{user.displayName || "Unnamed user"}</dd>
          <dd className="truncate text-xs text-[var(--color-muted)]">{user.email}</dd>
        </div>
      </div>
      <DetailRow label="Status" value={user.online ? "Online" : "Offline"} />
      <DetailRow label="Active sessions" value={formatNumber(user.activeSessions ?? 0)} />
      <DetailRow
        label="Last login"
        value={user.lastLoginAt ? formatDateTime(user.lastLoginAt, timeZone) : "Never"}
      />
      <DetailRow label="IP address" value={user.lastLoginIp || "—"} />
      <DetailRow label="Device" value={deviceLabel(user.lastLoginUserAgent)} />
    </dl>
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

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <aside className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Recent activity</h3>
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
    const connect = () => {
      const url = new URL("/ws", GATEWAY_URL || window.location.origin);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(url, ["jwt", token]);
      socketRef.current = socket;
      socket.addEventListener("open", () => {
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
        if (!disposed) retry = window.setTimeout(connect, 3_000);
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
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
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

  return (
    <Modal
      title={title}
      eyebrow="Edit resource"
      description="Update the profile identity and optionally rotate the user's password."
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
              />
            </Field>
          </div>
        </ModalSection>

        <ModalSection
          title="Credentials"
          description="Leave this blank to keep the current password. A new password revokes active sessions."
        >
          <Field label="New password">
            <Input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
        </ModalSection>

        {error ? <Alert message={error} /> : null}
        <ModalActions>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function RegisterUserModal({
  onClose,
  onSaved,
}: {
  onClose(): void;
  onSaved(): void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [error, setError] = useState("");

  // Same normalized shape as the roles page (shared ["roles"] cache entry).
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/roles");
      if (error) throw new Error("failed to load roles");
      return (data?.data as { items?: { id: number; name: string }[] })?.items ?? [];
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
    },
    onSuccess: onSaved,
    onError: (err) => setError((err as Error).message),
  });

  const toggleRole = (id: number) =>
    setRoleIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Modal
      title="Register user"
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
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Temporary password">
              <Input
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
          </div>
        </ModalSection>

        <ModalSection
          title="Initial access"
          description="Assign one or more roles now, or leave access empty for later."
        >
          <fieldset>
            <legend className="sr-only">Assigned roles</legend>
            <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2">
              {roles.isPending ? (
                <div className="flex items-center gap-2 px-2 py-3 text-xs text-[var(--color-muted)]">
                  <Spinner /> Loading roles…
                </div>
              ) : null}
              {(roles.data ?? []).map((r) => (
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
          <Button type="submit" disabled={save.isPending || !email || password.length < 8}>
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
