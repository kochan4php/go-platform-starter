import { Alert, Button, Card, Field, Input, Modal, Spinner, Td, Th } from "@starter/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type Role, api } from "./api-client";

/**
 * Role editor + permission sync (PLAN item 64). Editing permissions PATCHes
 * the full replacement set; the server bumps affected users' `ver`, which
 * forces token refresh on their next call (claims-staleness defense).
 */
export function RolesPage() {
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/roles");
      if (error) throw new Error((error as { message?: string }).message ?? "failed to load roles");
      return data?.data as { items: Role[] };
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/v1/rbac/roles/{id}", { params: { path: { id } } });
      if (error) throw new Error("delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });

  if (roles.isPending) return <Spinner />;
  if (roles.isError) return <Alert message={(roles.error as Error).message} />;

  return (
    <Card title="Roles">
      <div className="mb-4">
        <Button onClick={() => setCreating(true)}>New role</Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Permissions</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {roles.data.items.map((r) => (
            <tr key={r.id}>
              <Td>{r.name}</Td>
              <Td>{r.permissions.length} assigned</Td>
              <Td>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(r)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => remove.mutate(r.id)} disabled={remove.isPending}>
                    Delete
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      {creating ? (
        <RoleModal
          title="Create role"
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: ["roles"] });
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
          }}
        />
      ) : null}
    </Card>
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
  const [error, setError] = useState("");

  // The catalog comes from the rbac service — unknown permission names are
  // rejected server-side with 400.
  const catalog = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/rbac/permissions");
      if (error) throw new Error("failed to load permission catalog");
      return (data?.data as { items: string[] }).items ?? [];
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
    onError: (err) => setError((err as Error).message),
  });

  function toggle(perm: string) {
    setPermissions((cur) => (cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm]));
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-3"
      >
        <Field label="Name">
          <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </Field>
        <Field label="Description">
          <Input
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
          />
        </Field>

        <fieldset>
          <legend className="ui-label block">Permissions (synced ver bump applies on save)</legend>
          <div className="max-h-48 space-y-1 overflow-auto rounded-md border border-[var(--color-line)] p-2 text-sm">
            {catalog.isPending ? <Spinner /> : null}
            {(catalog.data ?? []).map((perm) => (
              <label key={perm} className="flex items-center gap-2">
                <input type="checkbox" checked={permissions.includes(perm)} onChange={() => toggle(perm)} />
                <code>{perm}</code>
              </label>
            ))}
          </div>
        </fieldset>

        {error ? <Alert message={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RolesPage;
