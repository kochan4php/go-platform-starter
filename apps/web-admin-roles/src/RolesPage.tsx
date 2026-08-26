import { PencilSimple, Trash } from "@phosphor-icons/react";
import {
  Alert,
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
  useConfirm,
  useToast,
} from "@starter/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { type Role, api } from "./api-client";

/**
 * Role management (PLAN item 64) rendered as horizontal accordion slices:
 * each role is a vertical sliver that unfolds on hover into its description,
 * permission chips and actions. Editing permissions PATCHes the full
 * replacement set; the server bumps affected users' `ver`, forcing token
 * refresh on their next call.
 */
export default function RolesPage() {
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  // First role starts unfolded; clicking a rail pins it open without hover.
  const [openId, setOpenId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/roles");
      if (error) throw new Error((error as { message?: string }).message ?? "failed to load roles");
      return (data?.data as { items?: Role[] })?.items ?? [];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await api.DELETE("/api/v1/rbac/roles/{id}", { params: { path: { id } } });
      if (error) throw new Error("delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast("success", "Role deleted");
    },
    onError: (error) => toast("error", (error as Error).message),
  });

  const requestDelete = async (role: Role) => {
    const ok = await confirm(
      `Delete ${role.name}?`,
      "Users assigned to this role may lose access after their next token refresh.",
      { danger: true, label: "Delete" },
    );
    if (!ok) return;
    const previous = queryClient.getQueryData<Role[]>(["roles"]);
    queryClient.setQueryData<Role[]>(["roles"], (current = []) =>
      current.filter((item) => item.id !== role.id),
    );
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled)
        remove.mutate(role.id, { onError: () => queryClient.setQueryData(["roles"], previous) });
    }, 5_000);
    toast.undo(`Role ${role.name} queued for deletion`, () => {
      cancelled = true;
      window.clearTimeout(timer);
      queryClient.setQueryData(["roles"], previous);
      toast("success", "Role deletion cancelled");
    });
  };

  // Keep the first slice unfolded so the page reads as content, not chrome.
  useEffect(() => {
    if (roles.data && roles.data.length > 0 && openId === null) {
      setOpenId(roles.data[0].id);
    }
  }, [roles.data, openId]);

  if (roles.isPending)
    return (
      <div className="space-y-6">
        <SkeletonLine w="w-1/2" />
        <div className="grid grid-cols-4 gap-px">
          <SkeletonBlock h="h-[440px] col-span-2" />
          <SkeletonBlock h="h-[440px]" />
          <SkeletonBlock h="h-[440px]" />
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

  const items = roles.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-6">
        <h2 className="max-w-3xl text-[clamp(1.6rem,2.4vw,2.4rem)] font-extrabold leading-tight tracking-tight">
          Access is a shape you draw — widen a slice to see what each role can touch.
        </h2>
        <Button onClick={() => setCreating(true)} className="shrink-0">
          New role
        </Button>
      </div>

      <div className="flex h-[440px] gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-line)]">
        {items.map((role) => {
          const isOpen = openId === role.id;
          return (
            <section
              key={role.id}
              className={`group relative min-w-0 overflow-hidden transition-all duration-700 ease-out ${
                isOpen
                  ? "flex-[3.5] bg-[var(--color-surface)]"
                  : "flex-1 bg-[var(--color-elevated)] hover:bg-[var(--color-surface)]"
              }`}
            >
              {!isOpen ? (
                <button
                  type="button"
                  onClick={() => setOpenId(role.id)}
                  aria-expanded={false}
                  className="absolute inset-0 flex w-full cursor-pointer flex-col items-center justify-between py-6"
                >
                  <span className="font-mono text-xs text-[var(--color-accent)]">
                    {String((role.permissions ?? []).length).padStart(2, "0")}
                  </span>
                  <span
                    className="text-sm font-bold tracking-wide text-[var(--color-muted)]"
                    style={{ writingMode: "vertical-rl" }}
                  >
                    {role.name}
                  </span>
                  <span className="block size-1.5 rounded-full bg-[var(--color-line)]" />
                </button>
              ) : (
                <div className="absolute inset-0 flex flex-col justify-between p-8">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">
                      Role
                    </p>
                    <h3 className="mt-2 text-3xl font-extrabold tracking-tight">{role.name}</h3>
                    {role.description ? (
                      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
                        {role.description}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold">{(role.permissions ?? []).length} assigned</p>
                    <div className="mb-6 flex max-h-24 flex-wrap gap-1.5 overflow-hidden">
                      {(role.permissions ?? []).slice(0, 6).map((perm) => (
                        <Badge key={perm} tone="accent">
                          {perm}
                        </Badge>
                      ))}
                      {(role.permissions?.length ?? 0) > 6 ? (
                        <Badge>+{role.permissions.length - 6}</Badge>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setEditing(role)}>
                        <PencilSimple size={14} />
                        Edit & sync
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => requestDelete(role)}
                        disabled={remove.isPending}
                      >
                        <Trash size={14} />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })}

        {items.length === 0 ? (
          <div className="flex w-full items-center justify-center p-10">
            <Card>
              <svg
                viewBox="0 0 64 64"
                fill="none"
                stroke="currentColor"
                className="mx-auto mb-4 size-12 text-[var(--color-muted)]/50"
                aria-hidden
              >
                <title>empty roles</title>
                <path d="M14 18h36v30H14zM22 18v-5h20v5M22 28h20M22 36h14" />
              </svg>
              <p className="text-sm text-[var(--color-muted)]">
                No roles yet — create the first one to start drawing access.
              </p>
            </Card>
          </div>
        ) : null}
      </div>

      {creating ? (
        <RoleModal
          title="Create role"
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast("success", "Role created");
          }}
        />
      ) : null}
      {editing ? (
        <RoleModal
          title={`Edit role: ${editing.name}`}
          role={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ["roles"] });
            toast("success", "Role updated");
          }}
        />
      ) : null}
    </div>
  );
}

function RoleModal({
  title,
  role,
  onClose,
  onSaved,
}: {
  title: string;
  role?: Role;
  onClose(): void;
  onSaved(): void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [newPerm, setNewPerm] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();

  // The catalog comes from the rbac service — unknown permission names are
  // rejected server-side with 400.
  const catalog = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/permissions");
      if (error) throw new Error("failed to load permission catalog");
      return (data?.data as { items?: string[] })?.items ?? [];
    },
  });

  const createPermissionMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error: e } = await api.POST("/api/v1/rbac/permissions", { body: { name } });
      if (e) throw new Error((e as { message?: string }).message ?? "create failed");
    },
    onSuccess: () => {
      catalog.refetch();
      toast("success", "Permission created");
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (role) {
        const { error: e } = await api.PATCH("/api/v1/rbac/roles/{id}", {
          params: { path: { id: role.id } },
          body: { name, description, permissions },
        });
        if (e) throw new Error((e as { message?: string }).message ?? "update failed");
        return;
      }
      const { error: e } = await api.POST("/api/v1/rbac/roles", {
        body: { name, description, permissions },
      });
      if (e) throw new Error((e as { message?: string }).message ?? "create failed");
    },
    onSuccess: onSaved,
    onError: (err) => {
      const msg = (err as Error).message;
      setError(
        msg === "conflict"
          ? "That name is already taken — pick another."
          : msg === "bad_request"
            ? "Unknown permission in the set."
            : msg,
      );
    },
  });

  function toggle(perm: string) {
    setPermissions((cur) => (cur.includes(perm) ? cur.filter((x) => x !== perm) : [...cur, perm]));
  }

  function createPermission() {
    const normalized = newPerm.trim().toLowerCase();
    if (!normalized || permissions.includes(normalized)) return;
    createPermissionMutation.mutate(normalized, {
      onSuccess: () => {
        setPermissions((cur) => [...cur, normalized]);
        setNewPerm("");
      },
      onError: (err) => {
        const message = (err as Error).message;
        setError(message === "conflict" ? "That name is already taken." : message);
      },
    });
  }

  return (
    <Modal
      title={title}
      eyebrow={role ? "Edit resource" : "Create resource"}
      description={
        role
          ? "Update the role identity and synchronize its complete permission set."
          : "Create a named access boundary, then choose exactly what it can reach."
      }
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
          title="Role details"
          description="Use a short, stable name; descriptions can explain scope."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                autoFocus
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="support-operator"
                required
                maxLength={80}
              />
            </Field>
            <Field label="Description">
              <Input
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this role is responsible for"
                maxLength={200}
              />
            </Field>
          </div>
        </ModalSection>

        <ModalSection
          title="Permissions"
          description="Saving replaces the full set and refreshes access versions for affected users."
        >
          <fieldset>
            <legend className="sr-only">Assigned permissions</legend>
            <div className="mb-3 flex gap-2">
              <Input
                value={newPerm}
                onChange={(e) => setNewPerm(e.target.value)}
                placeholder="resource:action:scope"
                aria-label="New permission name"
                className="flex-1 font-mono text-xs"
              />
              <Button
                type="button"
                onClick={createPermission}
                variant="ghost"
                disabled={!newPerm.trim() || createPermissionMutation.isPending}
              >
                {createPermissionMutation.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
            <div className="max-h-56 space-y-1 overflow-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2">
              {catalog.isPending ? (
                <div className="flex items-center gap-2 px-2 py-3 text-xs text-[var(--color-muted)]">
                  <Spinner /> Loading permissions…
                </div>
              ) : null}
              {(catalog.data ?? []).map((perm) => (
                <label key={perm} className="ui-choice">
                  <input
                    type="checkbox"
                    checked={permissions.includes(perm)}
                    onChange={() => toggle(perm)}
                    className="size-3.5 accent-[var(--color-accent)]"
                  />
                  <code className="font-mono text-xs">{perm}</code>
                </label>
              ))}
              {catalog.data?.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[var(--color-muted)]">No permissions available yet.</p>
              ) : null}
            </div>
          </fieldset>
        </ModalSection>

        {error ? <Alert message={error} /> : null}
        <ModalActions>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending || !name.trim()}>
            {save.isPending ? "Saving…" : role ? "Save changes" : "Create role"}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
