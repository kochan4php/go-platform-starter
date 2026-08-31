import { PencilSimple, Trash } from "@phosphor-icons/react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  ModalActions,
  ModalSection,
  SkeletonBlock,
  SkeletonLine,
  Spinner,
  Tooltip,
  useConfirm,
  useToast,
} from "@starter/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { type PermissionInfo, type Role, api } from "./api-client";

type Profile = {
  id: number;
  email: string;
  displayName?: string;
  roles?: Array<{ id: number; name: string }>;
};

type AuditEntry = {
  id: number;
  action: string;
  actorSub: string;
  createdAt: string;
  meta?: { before?: Partial<Role>; after?: Partial<Role> };
};

const iconGlyphs: Record<string, string> = {
  shield: "◆",
  crown: "♛",
  key: "⌁",
  users: "●",
  wrench: "✦",
  eye: "◉",
};
const iconNames = Object.keys(iconGlyphs);
const reservedNames = new Set(["admin", "system", "root", "superuser"]);
const roleNamePattern = /^[a-z][a-z0-9_-]{1,59}$/;
const permissionPattern = /^[a-z0-9_]+:[a-z0-9_]+:[a-z0-9_]+$/;

function roleBody(role: Role, permissions = role.permissions) {
  return {
    name: role.name,
    description: role.description,
    color: role.color,
    icon: role.icon,
    archived: role.archived,
    permissions,
  };
}

function permissionDescription(name: string) {
  const [resource, action, scope] = name.split(":");
  return `${action || "use"} ${resource || "resource"} in ${scope || "the allowed scope"}`;
}

function permissionRoute(name: string) {
  const resource = name.split(":")[0];
  if (resource === "user") return "/admin/users";
  if (resource === "audit") return "/admin/audit";
  return "/admin/roles";
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-[var(--color-accent)]/20 text-inherit">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm leading-relaxed text-[var(--color-muted)]">
      {(text || "No description provided.").split("\n").map((line, index) => {
        const parts = line.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: parsed markdown lines are stateless and preserve source order
          <p key={`${line}-${index}`}>
            {parts.map((part, partIndex) =>
              part.startsWith("**") ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: parsed markdown fragments are stateless and preserve source order
                <strong key={`${part}-${partIndex}`}>{part.slice(2, -2)}</strong>
              ) : part.startsWith("`") ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: parsed markdown fragments are stateless and preserve source order
                <code key={`${part}-${partIndex}`} className="rounded bg-[var(--color-hover)] px-1">
                  {part.slice(1, -1)}
                </code>
              ) : (
                part
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

function download(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportMatrixPng(roles: Role[], permissions: PermissionInfo[]) {
  const rowHeight = 28;
  const labelWidth = 240;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(720, labelWidth + roles.length * 130);
  canvas.height = 64 + permissions.length * rowHeight;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = "bold 14px sans-serif";
  context.fillStyle = "#111827";
  context.fillText("Permission", 12, 28);
  roles.forEach((role, index) => context.fillText(role.name, labelWidth + index * 130, 28));
  context.font = "12px monospace";
  permissions.forEach((permission, row) => {
    const y = 58 + row * rowHeight;
    context.fillStyle = row % 2 ? "#f8fafc" : "#ffffff";
    context.fillRect(0, y - 18, canvas.width, rowHeight);
    context.fillStyle = "#334155";
    context.fillText(permission.name, 12, y);
    roles.forEach((role, column) => {
      context.fillStyle = role.permissions.includes(permission.name) ? role.color || "#4f46e5" : "#cbd5e1";
      context.fillText(
        role.permissions.includes(permission.name) ? "YES" : "-",
        labelWidth + column * 130,
        y,
      );
    });
  });
  const anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = "roles-permissions-matrix.png";
  anchor.click();
}

export default function RolesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [view, setView] = useState<"slices" | "matrix">("slices");
  const [multiOpen, setMultiOpen] = useState(false);
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [openScale, setOpenScale] = useState(4);
  const [editing, setEditing] = useState<Role | null>(null);
  const [seed, setSeed] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [dirtyRoleId, setDirtyRoleId] = useState<number | null>(null);
  const [usersRole, setUsersRole] = useState<Role | null>(null);
  const [auditRole, setAuditRole] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/roles");
      if (error) throw new Error((error as { message?: string }).message ?? "failed to load roles");
      return ((data?.data as { items?: Role[] })?.items ?? []).map((role) => ({
        ...role,
        color: role.color ?? "#6366f1",
        icon: role.icon ?? "shield",
        archived: role.archived ?? false,
        createdAt: role.createdAt ?? "",
        userCount: role.userCount ?? 0,
        system: role.system ?? role.name === "admin",
      }));
    },
  });
  const catalog = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/permissions");
      if (error) throw new Error("failed to load permission catalog");
      const items = (data?.data as { items?: Array<PermissionInfo | string> })?.items ?? [];
      return items.map((item) =>
        typeof item === "string" ? { name: item, createdAt: "", roleCount: 0 } : item,
      );
    },
  });

  useEffect(() => {
    if (roles.data?.length && openIds.length === 0) setOpenIds([roles.data[0].id]);
  }, [roles.data, openIds.length]);

  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = (roles.data ?? []).filter(
      (role) =>
        !needle ||
        role.name.toLowerCase().includes(needle) ||
        role.description.toLowerCase().includes(needle) ||
        role.permissions.some((permission) => permission.includes(needle)),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "users") return b.userCount - a.userCount;
      if (sort === "permissions") return b.permissions.length - a.permissions.length;
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      return a.name.localeCompare(b.name);
    });
  }, [roles.data, search, sort]);

  const matrixToggle = useMutation({
    mutationFn: async ({ role, permission }: { role: Role; permission: string }) => {
      const next = role.permissions.includes(permission)
        ? role.permissions.filter((item) => item !== permission)
        : [...role.permissions, permission];
      const { error } = await api.PATCH("/api/v1/rbac/roles/{id}", {
        params: { path: { id: role.id } },
        body: roleBody(role, next),
      });
      if (error) throw new Error("permission update failed");
      return { id: role.id, permissions: next };
    },
    onMutate: async ({ role, permission }) => {
      await queryClient.cancelQueries({ queryKey: ["roles"] });
      const previous = queryClient.getQueryData<Role[]>(["roles"]);
      queryClient.setQueryData<Role[]>(["roles"], (current = []) =>
        current.map((item) =>
          item.id === role.id
            ? {
                ...item,
                permissions: item.permissions.includes(permission)
                  ? item.permissions.filter((value) => value !== permission)
                  : [...item.permissions, permission],
              }
            : item,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(["roles"], context?.previous);
      toast("error", "Permission update failed; the previous value was restored.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      void queryClient.invalidateQueries({ queryKey: ["permissions"] });
    },
  });

  function toggleOpen(id: number) {
    setOpenIds((current) => {
      if (!multiOpen) return current.includes(id) ? [] : [id];
      return current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    });
  }

  function keyboardNavigate(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-role-rail]"));
    const index = buttons.indexOf(event.currentTarget);
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    buttons[(index + direction + buttons.length) % buttons.length]?.focus();
  }

  function exportCsv() {
    const header = ["permission", ...(roles.data ?? []).map((role) => role.name)];
    const rows = (catalog.data ?? []).map((permission) => [
      permission.name,
      ...(roles.data ?? []).map((role) => (role.permissions.includes(permission.name) ? "yes" : "no")),
    ]);
    download(
      "roles-permissions-matrix.csv",
      [header, ...rows]
        .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
        .join("\n"),
      "text/csv",
    );
  }

  function exportJson(role: Role) {
    const { id: _id, createdAt: _createdAt, userCount: _userCount, system: _system, ...portable } = role;
    download(`${role.name}.role.json`, `${JSON.stringify(portable, null, 2)}\n`, "application/json");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<Role>;
      if (!parsed.name || !Array.isArray(parsed.permissions)) throw new Error("Invalid role JSON");
      setSeed({
        id: 0,
        name: parsed.name,
        description: parsed.description ?? "",
        color: parsed.color ?? "#6366f1",
        icon: parsed.icon ?? "shield",
        archived: Boolean(parsed.archived),
        createdAt: "",
        userCount: 0,
        system: false,
        permissions: parsed.permissions,
      });
      setCreating(true);
    } catch (error) {
      toast("error", (error as Error).message);
    }
  }

  if (roles.isPending)
    return (
      <div className="space-y-6" aria-label="Loading roles">
        <SkeletonLine w="w-1/2" />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <SkeletonBlock h="h-72 md:col-span-2" />
          <SkeletonBlock h="h-72" />
          <SkeletonBlock h="h-72" />
        </div>
      </div>
    );
  if (roles.isError)
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <Alert message={(roles.error as Error).message} />
        <Button onClick={() => roles.refetch()}>Retry</Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-accent)]">
            Access control
          </p>
          <h2 className="mt-2 max-w-3xl text-[clamp(1.6rem,2.4vw,2.4rem)] font-extrabold leading-tight tracking-tight">
            Roles & permissions
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {roles.data?.length ?? 0} roles · {catalog.data?.length ?? 0} permissions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => setCompareOpen(true)}
            disabled={(roles.data?.length ?? 0) < 2}
          >
            Compare
          </Button>
          <Button variant="ghost" onClick={() => setSimulateOpen(true)}>
            Simulate access
          </Button>
          <Button variant="ghost" onClick={() => importRef.current?.click()}>
            Import JSON
          </Button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
          <Button
            onClick={() => {
              setSeed(null);
              setCreating(true);
            }}
          >
            New role
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto]">
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search roles or permissions"
            aria-label="Search roles"
          />
          <select
            className="ui-input"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort roles"
          >
            <option value="name">Name A–Z</option>
            <option value="users">Most users</option>
            <option value="permissions">Most permissions</option>
            <option value="newest">Newest</option>
          </select>
          <div className="flex rounded-xl border border-[var(--color-line)] p-1" aria-label="Role view">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs ${view === "slices" ? "bg-[var(--color-ink)] text-[var(--color-canvas)]" : ""}`}
              onClick={() => setView("slices")}
            >
              Cards
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs ${view === "matrix" ? "bg-[var(--color-ink)] text-[var(--color-canvas)]" : ""}`}
              onClick={() => setView("matrix")}
            >
              Matrix
            </button>
          </div>
          {view === "slices" ? (
            <label className="ui-choice whitespace-nowrap">
              <input
                type="checkbox"
                checked={multiOpen}
                onChange={(event) => setMultiOpen(event.target.checked)}
              />
              Multi-open
            </label>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={exportCsv}>
                CSV
              </Button>
              <Button variant="ghost" onClick={() => exportMatrixPng(roles.data ?? [], catalog.data ?? [])}>
                PNG
              </Button>
            </div>
          )}
        </div>
      </Card>

      {view === "matrix" ? (
        <PermissionMatrix
          roles={items}
          permissions={catalog.data ?? []}
          pending={matrixToggle.isPending}
          onToggle={(role, permission) => matrixToggle.mutate({ role, permission })}
        />
      ) : items.length ? (
        <div className="flex min-h-[360px] flex-col gap-2 md:h-[500px] md:flex-row md:gap-px md:overflow-hidden md:rounded-[var(--radius-card)] md:border md:border-[var(--color-line)] md:bg-[var(--color-line)]">
          {items.map((role) => {
            const isOpen = openIds.includes(role.id);
            return (
              <section
                key={role.id}
                style={{ flex: isOpen ? openScale : 1 }}
                className={`relative min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] transition-[flex] duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] md:rounded-none md:border-0 ${isOpen ? "bg-[var(--color-surface)]" : "bg-[var(--color-elevated)]"}`}
              >
                <button
                  type="button"
                  data-role-rail
                  onClick={() => toggleOpen(role.id)}
                  onKeyDown={keyboardNavigate}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center gap-3 p-4 text-left ${isOpen ? "border-b border-[var(--color-line)] md:hidden" : "md:absolute md:inset-0 md:flex-col md:justify-between md:py-6"}`}
                >
                  <span
                    className="flex size-9 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: `${role.color}22`, color: role.color }}
                    aria-hidden
                  >
                    {iconGlyphs[role.icon] ?? iconGlyphs.shield}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate font-bold ${!isOpen ? "md:[writing-mode:vertical-rl]" : ""}`}
                  >
                    <Highlight text={role.name} query={search} />
                  </span>
                  <span key={`${role.id}-${role.permissions.length}`} className="ui-count-pop">
                    <Badge tone={role.archived ? "danger" : "accent"}>{role.permissions.length}</Badge>
                  </span>
                </button>
                {isOpen ? (
                  <div className="flex h-full min-h-[330px] flex-col justify-between gap-6 p-5 md:p-7">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="flex size-11 items-center justify-center rounded-2xl text-xl"
                          style={{ backgroundColor: `${role.color}22`, color: role.color }}
                        >
                          {iconGlyphs[role.icon] ?? iconGlyphs.shield}
                        </span>
                        <h3 className="text-2xl font-extrabold tracking-tight">
                          <Highlight text={role.name} query={search} />
                        </h3>
                        {role.system ? <Badge tone="danger">🔒 System role</Badge> : null}
                        {role.archived ? <Badge>Archived</Badge> : null}
                        {dirtyRoleId === role.id ? <Badge tone="accent">Unsaved</Badge> : null}
                      </div>
                      <div className="mt-4 max-w-xl">
                        <Markdown text={role.description} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setUsersRole(role)}
                        className="mt-4 text-sm font-semibold text-[var(--color-accent)] underline decoration-dotted underline-offset-4"
                      >
                        {role.userCount} {role.userCount === 1 ? "user" : "users"} assigned
                      </button>
                    </div>
                    <div>
                      <div className="mb-4 flex max-h-28 flex-wrap gap-1.5 overflow-auto">
                        {role.permissions.slice(0, 12).map((permission) => (
                          <Tooltip key={permission} label={permissionDescription(permission)}>
                            <a href={`${permissionRoute(permission)}#${permission}`}>
                              <Badge tone="accent">
                                <Highlight text={permission} query={search} />
                              </Badge>
                            </a>
                          </Tooltip>
                        ))}
                        {role.permissions.length > 12 ? <Badge>+{role.permissions.length - 12}</Badge> : null}
                        {role.permissions.length === 0 ? (
                          <span className="text-xs text-[var(--color-danger)]">No permissions assigned</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" onClick={() => setEditing(role)}>
                          <PencilSimple size={14} /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setSeed({
                              ...role,
                              id: 0,
                              name: `${role.name}-copy`,
                              system: false,
                              userCount: 0,
                            });
                            setCreating(true);
                          }}
                        >
                          Clone
                        </Button>
                        <Button variant="ghost" onClick={() => setUsersRole(role)}>
                          Users
                        </Button>
                        <Button variant="ghost" onClick={() => setAuditRole(role)}>
                          Audit
                        </Button>
                        <Button variant="ghost" onClick={() => exportJson(role)}>
                          Export
                        </Button>
                        <Button variant="danger" disabled={role.system} onClick={() => setDeleting(role)}>
                          <Trash size={14} /> Delete
                        </Button>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Resize ${role.name} panel`}
                      className="absolute inset-y-0 right-0 hidden w-2 cursor-ew-resize bg-transparent hover:bg-[var(--color-accent)]/20 md:block"
                      onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
                      onPointerMove={(event) => {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                          setOpenScale((current) => Math.min(7, Math.max(2, current + event.movementX / 80)));
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                          event.preventDefault();
                          setOpenScale((current) =>
                            Math.min(7, Math.max(2, current + (event.key === "ArrowRight" ? 0.5 : -0.5))),
                          );
                        }
                      }}
                    />
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <div className="mb-4 text-5xl text-[var(--color-muted)]" aria-hidden>
              ◇
            </div>
            <h3 className="font-bold">{search ? "No matching roles" : "No roles yet"}</h3>
            <p className="mt-2 max-w-sm text-sm text-[var(--color-muted)]">
              {search ? "Try another name or permission." : "Create the first access boundary for your team."}
            </p>
            <Button className="mt-5" onClick={() => (search ? setSearch("") : setCreating(true))}>
              {search ? "Clear search" : "Create first role"}
            </Button>
          </div>
        </Card>
      )}

      {creating ? (
        <RoleModal
          role={seed ?? undefined}
          cloning={Boolean(seed)}
          onDirtyChange={(dirty) => setDirtyRoleId(dirty ? 0 : null)}
          onClose={() => {
            setCreating(false);
            setSeed(null);
            setDirtyRoleId(null);
          }}
          onSaved={(name) => {
            setCreating(false);
            setSeed(null);
            setDirtyRoleId(null);
            void queryClient.invalidateQueries({ queryKey: ["roles"] });
            void queryClient.invalidateQueries({ queryKey: ["permissions"] });
            toast("success", `Role ${name} created`);
          }}
        />
      ) : null}
      {editing ? (
        <RoleModal
          role={editing}
          onDirtyChange={(dirty) => setDirtyRoleId(dirty ? editing.id : null)}
          onClose={() => {
            setEditing(null);
            setDirtyRoleId(null);
          }}
          onSaved={(name) => {
            setEditing(null);
            setDirtyRoleId(null);
            void queryClient.invalidateQueries({ queryKey: ["roles"] });
            void queryClient.invalidateQueries({ queryKey: ["permissions"] });
            toast("success", `Role ${name} updated`);
          }}
        />
      ) : null}
      {usersRole ? (
        <RoleUsersModal role={usersRole} roles={roles.data ?? []} onClose={() => setUsersRole(null)} />
      ) : null}
      {auditRole ? <AuditModal role={auditRole} onClose={() => setAuditRole(null)} /> : null}
      {deleting ? (
        <DeleteRoleModal role={deleting} roles={roles.data ?? []} onClose={() => setDeleting(null)} />
      ) : null}
      {compareOpen ? <CompareModal roles={roles.data ?? []} onClose={() => setCompareOpen(false)} /> : null}
      {simulateOpen ? (
        <SimulateModal roles={roles.data ?? []} onClose={() => setSimulateOpen(false)} />
      ) : null}
    </div>
  );
}

function PermissionMatrix({
  roles,
  permissions,
  pending,
  onToggle,
}: {
  roles: Role[];
  permissions: PermissionInfo[];
  pending: boolean;
  onToggle(role: Role, permission: string): void;
}) {
  return (
    <Card>
      <div className="overflow-auto">
        <table className="w-full min-w-[680px] text-sm">
          <caption className="sr-only">Permissions assigned to each role</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-[var(--z-sticky)] bg-[var(--color-surface)] px-3 py-3 text-left"
              >
                Permission
              </th>
              {roles.map((role) => (
                <th scope="col" key={role.id} className="px-3 py-3 text-center">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((permission) => (
              <tr key={permission.name} className="border-t border-[var(--color-line)]">
                <th
                  scope="row"
                  className="sticky left-0 z-[var(--z-sticky)] bg-[var(--color-surface)] px-3 py-3 text-left font-mono text-xs"
                >
                  <Tooltip label={permissionDescription(permission.name)}>
                    <a href={`${permissionRoute(permission.name)}#${permission.name}`}>{permission.name}</a>
                  </Tooltip>
                </th>
                {roles.map((role) => (
                  <td key={role.id} className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${role.name}: ${permission.name}`}
                      checked={role.permissions.includes(permission.name)}
                      disabled={pending || role.archived}
                      onChange={() => onToggle(role, permission.name)}
                      className="size-4 accent-[var(--color-accent)]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RoleModal({
  role,
  cloning = false,
  onClose,
  onSaved,
  onDirtyChange,
}: {
  role?: Role;
  cloning?: boolean;
  onClose(): void;
  onSaved(name: string): void;
  onDirtyChange(dirty: boolean): void;
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const queryClient = useQueryClient();
  const editing = Boolean(role && !cloning && role.id);
  const initial = useMemo(
    () => ({
      name: role?.name ?? "",
      description: role?.description ?? "",
      color: role?.color ?? "#6366f1",
      icon: role?.icon ?? "shield",
      archived: role?.archived ?? false,
      permissions: role?.permissions ?? [],
    }),
    [role],
  );
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [color, setColor] = useState(initial.color);
  const [icon, setIcon] = useState(initial.icon);
  const [archived, setArchived] = useState(initial.archived);
  const [selected, setSelected] = useState<string[]>(initial.permissions);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [filterPending, startFilterTransition] = useTransition();
  const [newPermission, setNewPermission] = useState("");
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [error, setError] = useState("");
  const initializedGroups = useRef(false);
  const dirty =
    JSON.stringify({ name, description, color, icon, archived, permissions: [...selected].sort() }) !==
    JSON.stringify({ ...initial, permissions: [...initial.permissions].sort() });
  const nameError = !name
    ? "Name is required."
    : !roleNamePattern.test(name)
      ? "Use lowercase letters, numbers, dash, or underscore (2–60 chars)."
      : !editing && reservedNames.has(name)
        ? "That name is reserved."
        : "";
  const formatError =
    newPermission && !permissionPattern.test(newPermission)
      ? "Expected resource:action:scope in lowercase."
      : "";

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const catalog = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/permissions");
      if (error) throw new Error("failed to load permissions");
      const items = (data?.data as { items?: Array<PermissionInfo | string> })?.items ?? [];
      return items.map((item) =>
        typeof item === "string" ? { name: item, createdAt: "", roleCount: 0 } : item,
      );
    },
  });
  const groups = useMemo(() => {
    const result = new Map<string, PermissionInfo[]>();
    for (const permission of catalog.data ?? []) {
      if (permissionSearch && !permission.name.includes(permissionSearch.toLowerCase())) continue;
      const group = permission.name.split(":")[0] || "other";
      result.set(group, [...(result.get(group) ?? []), permission]);
    }
    return [...result.entries()];
  }, [catalog.data, permissionSearch]);

  useEffect(() => {
    if (!initializedGroups.current && groups.length) {
      initializedGroups.current = true;
      setOpenGroups(groups.map(([group]) => group));
    }
  }, [groups]);

  const createPermission = useMutation({
    mutationFn: async (permission: string) => {
      const { error: apiError } = await api.POST("/api/v1/rbac/permissions", { body: { name: permission } });
      if (apiError) throw new Error((apiError as { message?: string }).message ?? "create failed");
    },
    onSuccess: (_data, permission) => {
      setSelected((current) => [...new Set([...current, permission])]);
      setNewPermission("");
      void queryClient.invalidateQueries({ queryKey: ["permissions"] });
      toast("success", `Permission ${permission} created`);
    },
    onError: (apiError) => setError((apiError as Error).message),
  });
  const deletePermission = useMutation({
    mutationFn: async (permission: string) => {
      const { error: apiError } = await api.DELETE("/api/v1/rbac/permissions/{name}", {
        params: { path: { name: permission } },
      });
      if (apiError) throw new Error("Only unused permissions can be deleted.");
    },
    onSuccess: (_data, permission) => {
      void queryClient.invalidateQueries({ queryKey: ["permissions"] });
      toast("success", `Permission ${permission} deleted`);
    },
    onError: (apiError) => setError((apiError as Error).message),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (nameError) throw new Error(nameError);
      if (editing && selected.length < initial.permissions.length) {
        const accepted = await confirm(
          "Reduce role access?",
          `${initial.permissions.length - selected.length} permission(s) will be removed. ${role?.userCount ?? 0} user(s) will be asked to sign in again.`,
          { danger: true, label: "Save reduced access" },
        );
        if (!accepted) throw new Error("cancelled");
      }
      const body = { name, description, color, icon, archived, permissions: selected };
      const response =
        editing && role
          ? await api.PATCH("/api/v1/rbac/roles/{id}", { params: { path: { id: role.id } }, body })
          : await api.POST("/api/v1/rbac/roles", { body });
      if (response.error) throw new Error((response.error as { message?: string }).message ?? "save failed");
    },
    onSuccess: () => onSaved(name),
    onError: (saveError) => {
      if ((saveError as Error).message !== "cancelled") setError((saveError as Error).message);
    },
  });

  async function closeSafely() {
    if (dirty) {
      const discard = await confirm("Discard unsaved changes?", "Your role edits have not been saved.", {
        danger: true,
        label: "Discard",
      });
      if (!discard) return;
    }
    onClose();
  }

  function setGroup(groupPermissions: PermissionInfo[], checked: boolean) {
    const names = groupPermissions.map((permission) => permission.name);
    setSelected((current) =>
      checked
        ? [...new Set([...current, ...names])]
        : current.filter((permission) => !names.includes(permission)),
    );
  }

  return (
    <Modal
      title={editing ? `Edit role: ${role?.name}` : cloning ? `Clone role: ${role?.name}` : "Create role"}
      eyebrow={editing ? "Edit access boundary" : "New access boundary"}
      description="Changes are validated, previewed, audited, and applied as one permission set."
      size="lg"
      onClose={() => void closeSafely()}
    >
      <form
        className="ui-modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <ModalSection
          title="Role details"
          description="Markdown is supported in the description: **bold** and `code`."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                autoFocus
                value={name}
                disabled={role?.system && editing}
                onChange={(event) => setName(event.target.value.toLowerCase())}
                aria-invalid={Boolean(nameError)}
                maxLength={60}
              />
              {nameError ? (
                <span className="mt-1 block text-xs text-[var(--color-danger)]">{nameError}</span>
              ) : null}
            </Field>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label="Icon">
                <select className="ui-input" value={icon} onChange={(event) => setIcon(event.target.value)}>
                  {iconNames.map((value) => (
                    <option key={value} value={value}>
                      {iconGlyphs[value]} {value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Color">
                <input
                  className="ui-input h-11 w-16 p-1"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </Field>
            </div>
          </div>
          <Field label="Description">
            <textarea
              className="ui-input min-h-24 resize-y"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={300}
              placeholder="Explain who should receive this role and why."
            />
          </Field>
          <div className="mt-3 rounded-xl border border-dashed border-[var(--color-line)] p-3">
            <Markdown text={description} />
          </div>
          <label className="ui-choice mt-4">
            <input
              type="checkbox"
              checked={archived}
              disabled={role?.system}
              onChange={(event) => setArchived(event.target.checked)}
            />
            Archive this role (hidden from new assignments)
          </label>
        </ModalSection>

        <ModalSection
          title="Permissions"
          description="Search by resource, action, or scope. Group switches update the complete set."
        >
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" aria-busy={filterPending}>
            <Input
              type="search"
              value={permissionSearch}
              onChange={(event) => {
                const value = event.target.value.toLowerCase();
                startFilterTransition(() => setPermissionSearch(value));
              }}
              placeholder="Search permissions"
              aria-label="Search permissions"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected((catalog.data ?? []).map((permission) => permission.name))}
            >
              Select all
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSelected([])}>
              Select none
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Input
                value={newPermission}
                onChange={(event) => setNewPermission(event.target.value.toLowerCase().trim())}
                list="permission-format-examples"
                placeholder="resource:action:scope"
                aria-label="New permission name"
                aria-invalid={Boolean(formatError)}
              />
              <span className="absolute right-3 top-3">
                <Tooltip label="Format: resource:action:scope, lowercase only">
                  <button
                    type="button"
                    className="font-mono text-xs text-[var(--color-muted)]"
                    aria-label="Permission format help"
                  >
                    ?
                  </button>
                </Tooltip>
              </span>
              <datalist id="permission-format-examples">
                {(catalog.data ?? []).map((permission) => (
                  <option key={permission.name} value={permission.name} />
                ))}
                <option value="report:read:any" />
                <option value="report:export:any" />
              </datalist>
              {formatError ? (
                <span className="mt-1 block text-xs text-[var(--color-danger)]">{formatError}</span>
              ) : (
                <span className="mt-1 block text-xs text-[var(--color-muted)]">
                  Example: report:export:any
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              disabled={!newPermission || Boolean(formatError) || createPermission.isPending}
              onClick={() => createPermission.mutate(newPermission)}
            >
              {createPermission.isPending ? "Adding…" : "Add permission"}
            </Button>
          </div>

          <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-1">
            {catalog.isPending ? (
              <p className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                <Spinner /> Loading permissions…
              </p>
            ) : null}
            {groups.map(([group, permissions]) => {
              const isOpen = openGroups.includes(group);
              const selectedCount = permissions.filter((permission) =>
                selected.includes(permission.name),
              ).length;
              return (
                <section
                  key={group}
                  className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]"
                >
                  <div className="flex items-center gap-2 p-2">
                    <button
                      type="button"
                      className="flex-1 text-left text-sm font-bold"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenGroups((current) =>
                          current.includes(group)
                            ? current.filter((value) => value !== group)
                            : [...current, group],
                        )
                      }
                    >
                      {isOpen ? "▾" : "▸"} {group}{" "}
                      <span className="font-normal text-[var(--color-muted)]">
                        {selectedCount}/{permissions.length}
                      </span>
                    </button>
                    <label className="ui-choice">
                      <input
                        type="checkbox"
                        checked={selectedCount === permissions.length}
                        onChange={(event) => setGroup(permissions, event.target.checked)}
                      />{" "}
                      Group
                    </label>
                  </div>
                  {isOpen ? (
                    <div className="border-t border-[var(--color-line)] p-2">
                      {permissions.map((permission) => {
                        const recent =
                          permission.createdAt &&
                          Date.now() - new Date(permission.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
                        const dependency =
                          permission.name.includes(":delete:") || permission.name.includes(":update:")
                            ? permission.name.replace(/:(delete|update):/, ":read:")
                            : "";
                        return (
                          <div
                            key={permission.name}
                            className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-[var(--color-hover)]"
                          >
                            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                checked={selected.includes(permission.name)}
                                onChange={() =>
                                  setSelected((current) =>
                                    current.includes(permission.name)
                                      ? current.filter((value) => value !== permission.name)
                                      : [...current, permission.name],
                                  )
                                }
                                className="mt-0.5 size-4 accent-[var(--color-accent)]"
                              />
                              <span className="min-w-0">
                                <code className="block break-all text-xs">
                                  <Highlight text={permission.name} query={permissionSearch} />
                                </code>
                                <span className="text-[11px] text-[var(--color-muted)]">
                                  {permissionDescription(permission.name)} · {permission.roleCount} role(s)
                                  {dependency ? ` · usually paired with ${dependency}` : ""} ·{" "}
                                  <a className="underline" href="/docs">
                                    route registry
                                  </a>
                                </span>
                              </span>
                            </label>
                            {recent ? <Badge tone="accent">New</Badge> : null}
                            {permission.roleCount === 0 ? (
                              <Tooltip label="Unused permission; safe to remove from the catalog">
                                <Button
                                  type="button"
                                  variant="danger"
                                  className="px-2 py-1 text-xs"
                                  disabled={deletePermission.isPending}
                                  onClick={() => deletePermission.mutate(permission.name)}
                                >
                                  Delete
                                </Button>
                              </Tooltip>
                            ) : (
                              <Badge>{permission.roleCount} used</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
            {groups.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--color-muted)]">
                No permissions match. Clear the search or create a valid permission.
              </p>
            ) : null}
          </div>
        </ModalSection>

        <ModalSection
          title="Change preview"
          description={`${role?.userCount ?? 0} assigned user(s) will be asked to sign in again after save.`}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-emerald-600">Added</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {selected
                  .filter((permission) => !initial.permissions.includes(permission))
                  .map((permission) => (
                    <Badge key={permission} tone="accent">
                      + {permission}
                    </Badge>
                  ))}
                {selected.every((permission) => initial.permissions.includes(permission)) ? (
                  <span className="text-xs text-[var(--color-muted)]">None</span>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--color-danger)]">Removed</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {initial.permissions
                  .filter((permission) => !selected.includes(permission))
                  .map((permission) => (
                    <Badge key={permission} tone="danger">
                      − {permission}
                    </Badge>
                  ))}
                {initial.permissions.every((permission) => selected.includes(permission)) ? (
                  <span className="text-xs text-[var(--color-muted)]">None</span>
                ) : null}
              </div>
            </div>
          </div>
          {selected.length === 0 ? (
            <Alert message="A role should keep at least one permission. Saving an empty role is allowed but may remove all access." />
          ) : null}
        </ModalSection>

        {error ? <Alert message={error} /> : null}
        <ModalActions>
          <span className="mr-auto text-xs text-[var(--color-muted)]">
            {dirty ? "Unsaved changes" : "No changes"}
          </span>
          <Button type="button" variant="ghost" onClick={() => void closeSafely()}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending || Boolean(nameError)}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Create role"}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}

async function loadUsers(roleId?: number) {
  const all: Profile[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await api.GET("/api/v1/users", {
      params: { query: { limit: 50, offset, roleId } },
    });
    if (error) throw new Error("failed to load users");
    const page = (data?.data as { items?: Profile[]; meta?: { total?: number } }) ?? {};
    all.push(...(page.items ?? []));
    if (all.length >= (page.meta?.total ?? all.length) || !page.items?.length) return all;
    offset += 50;
  }
}

function RoleUsersModal({ role, roles, onClose }: { role: Role; roles: Role[]; onClose(): void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const users = useQuery({ queryKey: ["role-users", role.id], queryFn: () => loadUsers(role.id) });
  const directory = useQuery({ queryKey: ["role-user-directory"], queryFn: () => loadUsers() });
  const visible = (directory.data ?? []).filter((user) =>
    `${user.displayName ?? ""} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
  );
  const assign = useMutation({
    mutationFn: async ({ user, add }: { user: Profile; add: boolean }) => {
      const current = (user.roles ?? []).map((item) => item.id);
      const roleIds = add ? [...new Set([...current, role.id])] : current.filter((id) => id !== role.id);
      const { error } = await api.PUT("/api/v1/rbac/users/{id}/roles", {
        params: { path: { id: user.id } },
        body: { roleIds },
      });
      if (error) throw new Error("role assignment failed");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["role-users", role.id] });
      void queryClient.invalidateQueries({ queryKey: ["role-user-directory"] });
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error) => toast("error", (error as Error).message),
  });
  const bulk = useMutation({
    mutationFn: async (add: boolean) => {
      const chosen = (directory.data ?? []).filter((user) => selected.includes(user.id));
      await Promise.all(
        chosen.map(async (user) => {
          const current = (user.roles ?? []).map((item) => item.id);
          const roleIds = add ? [...new Set([...current, role.id])] : current.filter((id) => id !== role.id);
          const { error } = await api.PUT("/api/v1/rbac/users/{id}/roles", {
            params: { path: { id: user.id } },
            body: { roleIds },
          });
          if (error) throw new Error(`failed for ${user.email}`);
        }),
      );
    },
    onSuccess: (_data, add) => {
      setSelected([]);
      void queryClient.invalidateQueries({ queryKey: ["role-users", role.id] });
      void queryClient.invalidateQueries({ queryKey: ["role-user-directory"] });
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast("success", `${add ? "Assigned" : "Removed"} ${role.name} in bulk`);
    },
    onError: (error) => toast("error", (error as Error).message),
  });
  return (
    <Modal
      title={`Users in ${role.name}`}
      eyebrow="Role usage"
      description={`${users.data?.length ?? role.userCount} currently assigned · changes force an access refresh.`}
      size="lg"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find user to assign"
            aria-label="Find user"
          />
          <Button
            variant="ghost"
            disabled={!selected.length || bulk.isPending}
            onClick={() => bulk.mutate(true)}
          >
            Assign selected
          </Button>
          <Button
            variant="danger"
            disabled={!selected.length || bulk.isPending}
            onClick={() => bulk.mutate(false)}
          >
            Remove selected
          </Button>
        </div>
        <div className="max-h-[55vh] divide-y divide-[var(--color-line)] overflow-auto rounded-xl border border-[var(--color-line)]">
          {directory.isPending ? (
            <p className="flex gap-2 p-4 text-sm">
              <Spinner /> Loading users…
            </p>
          ) : null}
          {visible.map((user) => {
            const hasRole = (user.roles ?? []).some((item) => item.id === role.id);
            return (
              <div key={user.id} className="flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  checked={selected.includes(user.id)}
                  onChange={() =>
                    setSelected((current) =>
                      current.includes(user.id)
                        ? current.filter((id) => id !== user.id)
                        : [...current, user.id],
                    )
                  }
                  aria-label={`Select ${user.email}`}
                />
                <Avatar seed={user.id} label={user.displayName || user.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{user.displayName || "Unnamed user"}</p>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {user.email} · {(user.roles ?? []).map((item) => item.name).join(", ") || "No role"}
                  </p>
                </div>
                <Button
                  variant={hasRole ? "danger" : "ghost"}
                  disabled={assign.isPending}
                  onClick={() => assign.mutate({ user, add: !hasRole })}
                >
                  {hasRole ? "Remove" : "Assign"}
                </Button>
              </div>
            );
          })}
          {!directory.isPending && visible.length === 0 ? (
            <p className="p-5 text-center text-sm text-[var(--color-muted)]">No users match.</p>
          ) : null}
        </div>
        <ModalActions>
          <span className="mr-auto text-xs text-[var(--color-muted)]">
            Available roles: {roles.filter((item) => !item.archived).length}
          </span>
          <Button onClick={onClose}>Done</Button>
        </ModalActions>
      </div>
    </Modal>
  );
}

function DeleteRoleModal({ role, roles, onClose }: { role: Role; roles: Role[]; onClose(): void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [fallbackRoleId, setFallbackRoleId] = useState(0);
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await api.DELETE("/api/v1/rbac/roles/{id}", {
        params: { path: { id: role.id }, query: { fallbackRoleId: fallbackRoleId || undefined } },
      });
      if (error) throw new Error((error as { message?: string }).message ?? "delete failed");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast("success", `Role ${role.name} deleted`);
      onClose();
    },
    onError: (error) => toast("error", (error as Error).message),
  });
  const fallbacks = roles.filter((item) => item.id !== role.id && !item.archived);
  return (
    <Modal
      title={`Delete ${role.name}`}
      eyebrow="Destructive action"
      description="This action is audited. Type the exact role name to continue."
      onClose={onClose}
    >
      <div className="space-y-4">
        {role.userCount > 0 ? (
          <Field label={`Move ${role.userCount} affected user(s) to`}>
            <select
              className="ui-input"
              value={fallbackRoleId}
              onChange={(event) => setFallbackRoleId(Number(event.target.value))}
              required
            >
              <option value={0}>Select fallback role</option>
              {fallbacks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Alert kind="info" message="This role has no assigned users." />
        )}
        <Field label={`Type ${role.name}`}>
          <Input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
        </Field>
        <ModalActions>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={typed !== role.name || (role.userCount > 0 && !fallbackRoleId) || remove.isPending}
            onClick={() => remove.mutate()}
          >
            {remove.isPending ? "Deleting…" : "Delete role"}
          </Button>
        </ModalActions>
      </div>
    </Modal>
  );
}

function AuditModal({ role, onClose }: { role: Role; onClose(): void }) {
  const audit = useQuery({
    queryKey: ["role-audit", role.id],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/audit/viewer", {
        params: { query: { limit: 50, offset: 0, entity: "role", entityId: String(role.id) } },
      });
      if (error) throw new Error("failed to load audit history");
      return (data?.data as { items?: AuditEntry[] })?.items ?? [];
    },
  });
  return (
    <Modal
      title={`Audit: ${role.name}`}
      eyebrow="Role changelog"
      description="Newest audited changes appear first."
      size="lg"
      onClose={onClose}
    >
      <div className="space-y-3">
        {audit.isPending ? (
          <p className="flex gap-2">
            <Spinner /> Loading history…
          </p>
        ) : null}
        {audit.isError ? <Alert message={(audit.error as Error).message} /> : null}
        {(audit.data ?? []).map((entry) => {
          const before = entry.meta?.before;
          const after = entry.meta?.after;
          const added = (after?.permissions ?? []).filter(
            (permission) => !(before?.permissions ?? []).includes(permission),
          );
          const removed = (before?.permissions ?? []).filter(
            (permission) => !(after?.permissions ?? []).includes(permission),
          );
          return (
            <article key={entry.id} className="rounded-xl border border-[var(--color-line)] p-4">
              <div className="flex justify-between gap-4">
                <p className="font-semibold">{entry.action}</p>
                <time className="text-xs text-[var(--color-muted)]">
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">Actor {entry.actorSub || "system"}</p>
              {added.length || removed.length ? (
                <p className="mt-2 text-xs">
                  {added.length ? `+ ${added.join(", ")}` : ""}
                  {added.length && removed.length ? " · " : ""}
                  {removed.length ? `− ${removed.join(", ")}` : ""}
                </p>
              ) : null}
            </article>
          );
        })}
        {!audit.isPending && audit.data?.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">No audit entries yet.</p>
        ) : null}
        <ModalActions>
          <Button onClick={onClose}>Done</Button>
        </ModalActions>
      </div>
    </Modal>
  );
}

function CompareModal({ roles, onClose }: { roles: Role[]; onClose(): void }) {
  const [leftId, setLeftId] = useState(roles[0]?.id ?? 0);
  const [rightId, setRightId] = useState(roles[1]?.id ?? roles[0]?.id ?? 0);
  const left = roles.find((role) => role.id === leftId) ?? roles[0];
  const right = roles.find((role) => role.id === rightId) ?? roles[1] ?? roles[0];
  const permissions = [...new Set([...(left?.permissions ?? []), ...(right?.permissions ?? [])])].sort();
  return (
    <Modal
      title="Compare roles"
      eyebrow="Permission diff"
      description="Compare two complete role permission sets."
      size="lg"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <select
            className="ui-input"
            value={leftId}
            onChange={(event) => setLeftId(Number(event.target.value))}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <select
            className="ui-input"
            value={rightId}
            onChange={(event) => setRightId(Number(event.target.value))}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
        <div className="max-h-[55vh] overflow-auto rounded-xl border border-[var(--color-line)]">
          {permissions.map((permission) => (
            <div
              key={permission}
              className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-[var(--color-line)] px-3 py-2 text-xs"
            >
              <code>{permission}</code>
              <span
                aria-label={`${left.name} ${left.permissions.includes(permission) ? "has" : "does not have"} ${permission}`}
              >
                {left.permissions.includes(permission) ? "✓" : "—"}
              </span>
              <span
                aria-label={`${right.name} ${right.permissions.includes(permission) ? "has" : "does not have"} ${permission}`}
              >
                {right.permissions.includes(permission) ? "✓" : "—"}
              </span>
            </div>
          ))}
        </div>
        <ModalActions>
          <Button onClick={onClose}>Done</Button>
        </ModalActions>
      </div>
    </Modal>
  );
}

function SimulateModal({ roles, onClose }: { roles: Role[]; onClose(): void }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [probe, setProbe] = useState("");
  const effective = [
    ...new Set(roles.filter((role) => selected.includes(role.id)).flatMap((role) => role.permissions)),
  ].sort();
  const canAccess = probe ? effective.includes(probe) : false;
  return (
    <Modal
      title="Simulate access"
      eyebrow="Effective permissions"
      description="Combine multiple roles and test a permission without changing any user."
      size="lg"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {roles
            .filter((role) => !role.archived)
            .map((role) => (
              <label key={role.id} className="ui-choice">
                <input
                  type="checkbox"
                  checked={selected.includes(role.id)}
                  onChange={() =>
                    setSelected((current) =>
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
        <Field label="Permission to test">
          <Input
            value={probe}
            onChange={(event) => setProbe(event.target.value)}
            list="effective-permissions"
            placeholder="user:read:any"
          />
          <datalist id="effective-permissions">
            {effective.map((permission) => (
              <option key={permission} value={permission} />
            ))}
          </datalist>
        </Field>
        {probe ? (
          <Alert
            kind="info"
            message={
              canAccess
                ? `Allowed via ${roles
                    .filter((role) => selected.includes(role.id) && role.permissions.includes(probe))
                    .map((role) => role.name)
                    .join(", ")}.`
                : "Denied by the selected role combination."
            }
          />
        ) : null}
        <section>
          <h3 className="text-sm font-bold">Effective set ({effective.length})</h3>
          <div className="mt-2 flex max-h-52 flex-wrap gap-1 overflow-auto">
            {effective.map((permission) => (
              <a key={permission} href={`${permissionRoute(permission)}#${permission}`}>
                <Badge tone="accent">{permission}</Badge>
              </a>
            ))}
            {effective.length === 0 ? (
              <span className="text-xs text-[var(--color-muted)]">Select one or more roles.</span>
            ) : null}
          </div>
        </section>
        <ModalActions>
          <Button onClick={onClose}>Done</Button>
        </ModalActions>
      </div>
    </Modal>
  );
}
