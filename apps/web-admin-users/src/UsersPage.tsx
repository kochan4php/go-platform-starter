import { useGSAP } from "@gsap/react";
import { ArrowRight, PencilSimple } from "@phosphor-icons/react";
import { Alert, Avatar, Button, Card, Field, Input, Modal, Spinner, Stat, Td, Th } from "@starter/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState } from "react";
import { api } from "./api-client";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export interface Profile {
  id: number;
  displayName: string;
  avatarUrl: string;
}

interface ListMeta {
  limit: number;
  offset: number;
  total: number;
}

const LIMIT = 20;

const REVEAL =
  "Every profile on this platform is provisioned by auth events, materialized by streams, and flushed through idempotent workers.";

/** Query keys follow docs/QUERY_KEYS.md: ['users', filters], ['user', id]. */
export default function UsersPage() {
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<Profile | null>(null);
  const queryClient = useQueryClient();

  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);

  const users = useQuery({
    queryKey: ["users", { limit: LIMIT, offset }],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/users", {
        params: { query: { limit: LIMIT, offset } },
      });
      if (error) throw new Error((error as { message?: string }).message ?? "failed to load users");
      return (data?.data ?? { items: [], meta: { limit: LIMIT, offset: 0, total: 0 } }) as {
        items: Profile[];
        meta: ListMeta;
      };
    },
  });

  const total = users.data?.meta.total ?? 0;

  // GSAP pass one: numeral count-up once the first page resolves.
  useGSAP(
    () => {
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
    mutationFn: async (id: number) => {
      const { error } = await api.DELETE("/api/v1/users/{id}", { params: { path: { id } } });
      if (error) throw new Error("delete failed");
    },
    onSuccess: refresh,
  });

  if (users.isPending) return <Spinner />;
  if (users.isError) return <Alert message={(users.error as Error).message} />;

  const { items, meta } = users.data;
  const newest = items[0];
  const pageCount = Math.max(1, Math.ceil(meta.total / LIMIT));
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div ref={rootRef} className="space-y-8">
      {/* masthead */}
      <div data-reveal className="max-w-5xl">
        <h2 className="text-[clamp(1.6rem,2.4vw,2.4rem)] font-extrabold leading-tight tracking-tight">
          {REVEAL.split(" ").map((word) => (
            <span key={word} data-word className="inline-block">
              {word}
              {"\u00A0"}
            </span>
          ))}
        </h2>
      </div>

      {/* gapless bento: 6 cols x 3 bands, spans tile every slot exactly */}
      <div className="grid auto-flow-dense grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-6">
        <div className="ui-card col-span-4 row-span-2 rounded-none border-0">
          <Stat
            label="Profiles on record"
            value={<span ref={countRef}>0</span>}
            hint={`showing ${items.length} on this page · ${pageCount} page${pageCount > 1 ? "s" : ""}`}
          />
        </div>

        <div className="relative col-span-2 row-span-2 min-h-[220px] overflow-hidden">
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

        <div className="col-span-2 flex flex-col justify-between gap-4 p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Latest arrival</p>
          {newest ? (
            <div className="flex items-center gap-3">
              <Avatar seed={newest.id} alt="" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{newest.displayName || "Unnamed profile"}</p>
                <p className="truncate font-mono text-[11px] text-[var(--color-muted)]">{newest.id}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">No profiles yet.</p>
          )}
        </div>

        <div className="col-span-2 flex items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">Window</p>
            <p className="mt-1 font-mono text-sm tabular-nums">
              {offset + 1}–{Math.min(offset + items.length, meta.total)} / {meta.total}
            </p>
          </div>
        </div>

        <div className="col-span-2 flex items-center justify-between gap-3 px-6 py-3">
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

      {/* directory table */}
      <Card title={`Users (${meta.total})`}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <Th>User</Th>
              <Th>ID</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-white/[0.03]">
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar seed={u.id} alt="" />
                    <span className="font-semibold">
                      {u.displayName || <span className="text-[var(--color-muted)]">—</span>}
                    </span>
                  </div>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-[var(--color-muted)]">{u.id}</span>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setEditing(u)}>
                      <PencilSimple size={14} />
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
                <Td>No profiles yet — they appear when users register.</Td>
                <Td />
                <Td />
                <Td />
                <Td />
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

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
    </div>
  );
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
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const { error: e } = await api.PATCH("/api/v1/users/{id}", {
        params: { path: { id: profile.id } },
        body: { id: profile.id, displayName },
      });
      if (e) throw new Error("update failed");
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
        className="space-y-4"
      >
        <Field label="ID">
          <Input value={profile.id} disabled />
        </Field>
        <Field label="Display name">
          <Input
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={120}
          />
        </Field>
        {error ? <Alert message={error} /> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
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
