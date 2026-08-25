import { Alert, Button, Card, Field, Input, Modal, Spinner, Td, Th } from "@starter/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "./api-client";

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string;
}

interface ListMeta {
  limit: number;
  offset: number;
  total: number;
}

const LIMIT = 20;

/** Query keys follow docs/QUERY_KEYS.md: ['users', filters], ['user', id]. */
export function UsersPage() {
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: ["users", { limit: LIMIT, offset }],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/users", {
        params: { query: { limit: LIMIT, offset } },
      });
      if (error) throw new Error((error as { message?: string }).message ?? "failed to load users");
      return data?.data as { items: Profile[]; meta: ListMeta };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/v1/users/{id}", { params: { path: { id } } });
      if (error) throw new Error("delete failed");
    },
    onSuccess: refresh,
  });

  if (users.isPending) return <Spinner />;
  if (users.isError) return <Alert message={(users.error as Error).message} />;

  const { items, meta } = users.data;

  return (
    <Card title={`Users (${meta.total})`}>
      <div className="mb-4">
        <Button onClick={() => setCreating(true)}>New user</Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Display name</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <tr key={u.id}>
              <Td>{u.id}</Td>
              <Td>{u.displayName || <span className="text-[var(--color-muted)]">—</span>}</Td>
              <Td>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(u)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => remove.mutate(u.id)} disabled={remove.isPending}>
                    Delete
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <Td>No profiles yet.</Td>
              <Td />
              <Td />
            </tr>
          ) : null}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="secondary"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - LIMIT))}
        >
          Previous
        </Button>
        <span className="text-sm text-[var(--color-muted)]">
          {offset + 1}–{Math.min(offset + items.length, meta.total)} of {meta.total}
        </span>
        <Button
          variant="secondary"
          disabled={offset + LIMIT >= meta.total}
          onClick={() => setOffset(offset + LIMIT)}
        >
          Next
        </Button>
      </div>

      {creating ? (
        <ProfileModal
          title="Create user"
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            refresh();
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
          }}
        />
      ) : null}
    </Card>
  );
}

function ProfileModal({
  title,
  profile,
  onClose,
  onSaved,
}: {
  title: string;
  profile?: Profile;
  onClose(): void;
  onSaved(): void;
}) {
  const [id, setId] = useState(profile?.id ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (profile) {
        const { error: e } = await api.PATCH("/api/v1/users/{id}", {
          params: { path: { id: profile.id } },
          body: { id: profile.id, displayName },
        });
        if (e) throw new Error("update failed");
        return;
      }
      const { error: e } = await api.POST("/api/v1/users", {
        body: { id, displayName },
      });
      if (e) throw new Error((e as { message?: string }).message ?? "create failed");
    },
    onSuccess: onSaved,
    onError: (err) => setError((err as Error).message),
  });

  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-3"
      >
        {profile ? (
          <Field label="ID">
            <Input value={profile.id} disabled />
          </Field>
        ) : (
          <Field label="User ID (uuid)">
            <Input
              name="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              pattern="[0-9a-fA-F-]{36}"
            />
          </Field>
        )}
        <Field label="Display name">
          <Input
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={120}
          />
        </Field>
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

export default UsersPage;
