import { GATEWAY_URL, decodeClaims, getAccessToken } from "@starter/contracts";
import { Alert, Button, Card, Field, Input } from "@starter/ui";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth-context";
import { secureRequest } from "./lib/api";
import { useToast } from "./lib/ui";

type RecordKind =
  | "notification"
  | "invitation"
  | "access_request"
  | "delegation"
  | "api_key"
  | "webhook"
  | "scheduled_report"
  | "saved_view"
  | "role_template"
  | "compliance_report"
  | "branding"
  | "domain"
  | "billing_usage"
  | "broadcast"
  | "chat_message"
  | "onboarding"
  | "retention"
  | "consumer_quota";

interface ProductRecord {
  id: number;
  kind: RecordKind;
  ownerId: number;
  subjectId?: number;
  name: string;
  status: string;
  payload: Record<string, unknown>;
  expiresAt?: string;
  createdAt: string;
}

interface Overview {
  users: { total: number; online: number; registrations: Array<{ day: string; count: number }> };
  unreadNotifications: number;
  pendingApprovals: number;
  activeDelegations: number;
  webhooks: number;
  scheduledReports: number;
}

interface Analytics {
  activityHeatmap: Array<{ day: number; hour: number; count: number }>;
  roleUsage: Array<{ id: number; name: string; users: number }>;
  usage: Record<string, number>;
  loginRisk: Array<{ riskScore: number; anomalous: boolean; count: number }>;
}

interface AuditEntry {
  id: number;
  actorSub: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

const kinds: Array<{ value: RecordKind; label: string; hint: string }> = [
  { value: "notification", label: "Notification", hint: "Persistent in-app inbox item" },
  { value: "invitation", label: "Invitation", hint: "Payload: email and optional role" },
  { value: "access_request", label: "Access request", hint: "Approval workflow item" },
  { value: "delegation", label: "Delegation", hint: "Temporary permission for subject ID" },
  { value: "api_key", label: "API key", hint: "Secret is shown once" },
  { value: "webhook", label: "Webhook", hint: "Payload requires a public HTTPS url" },
  { value: "scheduled_report", label: "Scheduled report / digest", hint: "daily or weekly email" },
  { value: "saved_view", label: "Saved view", hint: "Persisted filters" },
  { value: "role_template", label: "Role template", hint: "Reusable permission bundle" },
  { value: "compliance_report", label: "Compliance report", hint: "Evidence report request" },
  { value: "branding", label: "Deployment branding", hint: "Name, colors, and logo" },
  { value: "domain", label: "Custom domain", hint: "Payload requires host" },
  { value: "billing_usage", label: "Usage adjustment", hint: "Internal usage metering record" },
  { value: "broadcast", label: "Broadcast", hint: "Admin announcement" },
  { value: "chat_message", label: "Direct message", hint: "Durable chat history" },
  { value: "onboarding", label: "Onboarding progress", hint: "Wizard and tour state" },
  { value: "retention", label: "Data retention", hint: "Deployment retention policy in days" },
  { value: "consumer_quota", label: "Consumer quota", hint: "Rate limit policy for one consumer" },
];

export default function ProductPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [overview, setOverview] = useState<Overview>();
  const [analytics, setAnalytics] = useState<Analytics>();
  const [records, setRecords] = useState<ProductRecord[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [kindFilter, setKindFilter] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ type: string; id: number; title: string; subtitle: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    kind: "notification" as RecordKind,
    name: "",
    subjectId: "",
    payload: "{}",
    expiresAt: "",
  });
  const [secret, setSecret] = useState("");
  const [simulation, setSimulation] = useState({ userId: "", permission: "", result: "" });
  const [impersonateID, setImpersonateID] = useState("");

  const load = useCallback(async () => {
    const suffix = kindFilter ? `?kind=${encodeURIComponent(kindFilter)}` : "";
    const [overviewData, recordsData, auditData, analyticsData] = await Promise.all([
      secureRequest<Overview>("/users/product/overview"),
      secureRequest<{ items?: ProductRecord[] }>(`/users/product/records${suffix}`),
      secureRequest<{ items?: AuditEntry[] }>(
        `/audit/viewer?limit=25${auditAction ? `&action=${encodeURIComponent(auditAction)}` : ""}`,
      ).catch(() => ({ items: [] })),
      secureRequest<Analytics>("/users/product/analytics"),
    ]);
    setOverview(overviewData);
    setRecords(recordsData.items ?? []);
    setAudit(auditData.items ?? []);
    setAnalytics(analyticsData);
  }, [auditAction, kindFilter]);

  useEffect(() => {
    setBusy(true);
    void load()
      .catch((error) =>
        toast("error", error instanceof Error ? error.message : "Could not load product data"),
      )
      .finally(() => setBusy(false));
  }, [load, toast]);

  async function createRecord(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = JSON.parse(form.payload) as Record<string, unknown>;
      const data = await secureRequest<{ record: ProductRecord; secret?: string }>("/users/product/records", {
        method: "POST",
        body: JSON.stringify({
          kind: form.kind,
          name: form.name,
          payload,
          ...(form.subjectId ? { subjectId: Number(form.subjectId) } : {}),
          ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt).toISOString() } : {}),
        }),
      });
      setSecret(data.secret ?? "");
      setForm((current) => ({ ...current, name: "", payload: "{}" }));
      toast("success", "Product record created.");
      await load();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not create product record");
    } finally {
      setBusy(false);
    }
  }

  async function updateRecord(record: ProductRecord, status: string) {
    try {
      await secureRequest(`/users/product/records/${record.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, payload: record.payload }),
      });
      await load();
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Could not update record");
    }
  }

  async function bulkInvite(file?: File) {
    if (!file) return;
    const lines = (await file.text())
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 100);
    let created = 0;
    for (const [index, line] of lines.entries()) {
      const [email, name = "Invitation"] = line.split(",").map((cell) => cell.trim());
      if (index === 0 && email.toLowerCase() === "email") continue;
      await secureRequest("/users/product/records", {
        method: "POST",
        body: JSON.stringify({ kind: "invitation", name, payload: { email } }),
      });
      created += 1;
    }
    toast("success", `${created} invitations queued.`);
    await load();
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await secureRequest<{ items?: typeof searchResults }>(
        `/users/product/search?q=${encodeURIComponent(search)}`,
      );
      setSearchResults(data.items ?? []);
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Search failed");
    }
  }

  async function simulate(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await secureRequest<{ allowed: boolean; sources: string[] }>(
        "/users/product/permissions/simulate",
        {
          method: "POST",
          body: JSON.stringify({ userId: Number(simulation.userId), permission: simulation.permission }),
        },
      );
      setSimulation((item) => ({
        ...item,
        result: `${data.allowed ? "Allowed" : "Denied"}${data.sources.length ? ` via ${data.sources.join(", ")}` : ""}`,
      }));
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Simulation failed");
    }
  }

  async function impersonate(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await secureRequest<{
        accessToken: string;
        user: { email: string };
        impersonator: string;
      }>(`/auth/impersonate/${Number(impersonateID)}`, { method: "POST" });
      const current = getAccessToken();
      if (current) sessionStorage.setItem("auth:original-token", current);
      if (user) sessionStorage.setItem("auth:original-user", JSON.stringify(user));
      sessionStorage.setItem("auth:impersonator", data.impersonator);
      const claims = decodeClaims(data.accessToken);
      if (!claims?.sub) throw new Error("Impersonation returned an invalid access token");
      login(
        data.accessToken,
        {
          id: String(impersonateID),
          email: data.user.email,
          perms: claims.perms ?? [],
          ver: claims.ver ?? 0,
        },
        { broadcast: false },
      );
      navigate("/admin/settings", { replace: true });
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Impersonation failed");
    }
  }

  return (
    <div className="space-y-6" aria-busy={busy}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-accent)]">
            Product operations
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Platform product console</h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-muted)]">
            One audited surface for invitations, approvals, integrations, reports, analytics, access support,
            and deployment-level product settings.
          </p>
        </div>
        <div className="flex gap-2">
          <a className="ui-button" href={`${GATEWAY_URL}/docs`} target="_blank" rel="noreferrer">
            API playground
          </a>
          <Button type="button" variant="ghost" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </header>

      {secret ? <Alert kind="info" message={`Copy this one-time secret now: ${secret}`} /> : null}
      <Tour
        onComplete={() =>
          void secureRequest("/users/product/records", {
            method: "POST",
            body: JSON.stringify({
              kind: "onboarding",
              name: "Product console tour",
              status: "complete",
              payload: { completedAt: new Date().toISOString() },
            }),
          })
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Users" value={overview?.users.total} />
        <Metric label="Online" value={overview?.users.online} />
        <Metric label="Unread" value={overview?.unreadNotifications} />
        <Metric label="Approvals" value={overview?.pendingApprovals} />
        <Metric label="Delegations" value={overview?.activeDelegations} />
        <Metric label="Schedules" value={overview?.scheduledReports} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card title="Registration trend">
          <div className="flex h-40 items-end gap-2" role="img" aria-label="Daily registrations">
            {(overview?.users.registrations ?? []).map((point) => {
              const max = Math.max(1, ...(overview?.users.registrations ?? []).map((item) => item.count));
              return (
                <div key={point.day} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs">{point.count}</span>
                  <span
                    className="w-full rounded-t bg-[var(--color-accent)]"
                    style={{ height: `${Math.max(4, (point.count / max) * 100)}px` }}
                  />
                  <span className="font-mono text-[9px] text-[var(--color-muted)]">{point.day.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Global search">
          <form onSubmit={runSearch} className="flex gap-2">
            <Input
              required
              minLength={2}
              maxLength={120}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Users, reports, integrations…"
            />
            <Button>Search</Button>
          </form>
          <ul className="mt-4 divide-y divide-[var(--color-line)]">
            {searchResults.map((item) => (
              <li key={`${item.type}-${item.id}`} className="py-2 text-sm">
                <strong>{item.title || `${item.type} ${item.id}`}</strong>
                <span className="ml-2 text-[var(--color-muted)]">
                  {item.type} · {item.subtitle}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card title="Create product capability">
          <form onSubmit={createRecord} className="space-y-4">
            <label className="block text-sm">
              <span className="ui-label block">Capability</span>
              <select
                className="ui-input"
                value={form.kind}
                onChange={(event) => setForm((item) => ({ ...item, kind: event.target.value as RecordKind }))}
              >
                {kinds.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-[var(--color-muted)]">
                {kinds.find((kind) => kind.value === form.kind)?.hint}
              </span>
            </label>
            <Field label="Name">
              <Input
                required
                maxLength={200}
                value={form.name}
                onChange={(event) => setForm((item) => ({ ...item, name: event.target.value }))}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Subject user ID (optional)">
                <Input
                  inputMode="numeric"
                  value={form.subjectId}
                  onChange={(event) =>
                    setForm((item) => ({ ...item, subjectId: event.target.value.replace(/\D/g, "") }))
                  }
                />
              </Field>
              <Field label="Expires (optional)">
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) => setForm((item) => ({ ...item, expiresAt: event.target.value }))}
                />
              </Field>
            </div>
            <label className="block text-sm">
              <span className="ui-label block">JSON payload</span>
              <textarea
                required
                className="ui-input min-h-28 font-mono text-xs"
                value={form.payload}
                onChange={(event) => setForm((item) => ({ ...item, payload: event.target.value }))}
              />
            </label>
            <Button disabled={busy}>Create</Button>
          </form>
          <label className="mt-6 block border-t border-[var(--color-line)] pt-5 text-sm">
            <span className="ui-label block">Bulk invite CSV (email,name)</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-2 block w-full text-sm"
              onChange={(event) => void bulkInvite(event.target.files?.[0])}
            />
          </label>
        </Card>
        <Card title="Workflow inbox and integrations">
          <div className="mb-4 flex gap-2">
            <select
              aria-label="Filter capability"
              className="ui-input max-w-xs"
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value)}
            >
              <option value="">All capabilities</option>
              {kinds.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </select>
          </div>
          <div className="max-h-[38rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface)] text-xs uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="p-2">Capability</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-t border-[var(--color-line)]">
                    <td className="p-2 font-mono text-xs">{record.kind}</td>
                    <td className="p-2">{record.name}</td>
                    <td className="p-2">{record.status}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="text-[var(--color-accent)] underline"
                        onClick={() =>
                          void updateRecord(
                            record,
                            record.status === "active" ||
                              record.status === "pending" ||
                              record.status === "unread"
                              ? "complete"
                              : "active",
                          )
                        }
                      >
                        {record.status === "complete" ? "Reopen" : "Complete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Permission simulation">
          <form onSubmit={simulate} className="grid gap-3 sm:grid-cols-[.5fr_1fr_auto]">
            <Input
              required
              inputMode="numeric"
              placeholder="User ID"
              value={simulation.userId}
              onChange={(event) =>
                setSimulation((item) => ({ ...item, userId: event.target.value.replace(/\D/g, "") }))
              }
            />
            <Input
              required
              placeholder="permission:name"
              value={simulation.permission}
              onChange={(event) => setSimulation((item) => ({ ...item, permission: event.target.value }))}
            />
            <Button>Simulate</Button>
          </form>
          {simulation.result ? (
            <output className="mt-4 block text-sm font-semibold">{simulation.result}</output>
          ) : null}
        </Card>
        <Card title="Audited support impersonation">
          <p className="mb-4 text-sm text-[var(--color-muted)]">
            Creates a read-only token for 15 minutes. Every start is written to the audit trail.
          </p>
          <form onSubmit={impersonate} className="flex gap-3">
            <Input
              required
              inputMode="numeric"
              placeholder="Target user ID"
              value={impersonateID}
              onChange={(event) => setImpersonateID(event.target.value.replace(/\D/g, ""))}
            />
            <Button variant="danger">Start support session</Button>
          </form>
        </Card>
      </div>

      <RealtimePanel />

      <Card title="Audit viewer and export">
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            className="max-w-sm"
            value={auditAction}
            onChange={(event) => setAuditAction(event.target.value)}
            placeholder="Filter exact action"
          />
          <Button type="button" variant="ghost" onClick={() => void load()}>
            Apply
          </Button>
          <Button type="button" variant="ghost" onClick={() => void exportAudit(auditAction, toast)}>
            Export CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-[var(--color-muted)]">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Actor</th>
                <th className="p-2">Action</th>
                <th className="p-2">Entity</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <tr key={entry.id} className="border-t border-[var(--color-line)]">
                  <td className="p-2">{new Date(entry.createdAt).toLocaleString()}</td>
                  <td className="p-2 font-mono">{entry.actorSub}</td>
                  <td className="p-2">{entry.action}</td>
                  <td className="p-2">
                    {entry.entity}:{entry.entityId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Activity heatmap">
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 84 }, (_, index) => {
              const day = Math.floor(index / 12);
              const hour = (index % 12) * 2;
              const count =
                analytics?.activityHeatmap.find((item) => item.day === day && item.hour === hour)?.count ?? 0;
              return (
                <span
                  key={`${day}-${hour}`}
                  title={`day ${day}, ${hour}:00 · ${count}`}
                  className="aspect-square rounded"
                  style={{
                    background: `color-mix(in srgb, var(--color-accent) ${Math.min(100, 8 + count * 12)}%, transparent)`,
                  }}
                />
              );
            })}
          </div>
        </Card>
        <Card title="Role usage">
          <ul className="space-y-2">
            {analytics?.roleUsage.map((role) => (
              <li key={role.id} className="flex justify-between text-sm">
                <span>{role.name}</span>
                <strong>{role.users}</strong>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Usage and billing meter">
          <ul className="space-y-2">
            {Object.entries(analytics?.usage ?? {}).map(([name, value]) => (
              <li key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <strong>{value.toLocaleString()}</strong>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[var(--color-muted)]">
            Informational metering only; no payment processor or automatic charge is enabled.
          </p>
        </Card>
      </div>
    </div>
  );
}

async function exportAudit(action: string, toast: ReturnType<typeof useToast>) {
  try {
    const response = await fetch(
      `${GATEWAY_URL}/api/v1/audit/viewer/export${action ? `?action=${encodeURIComponent(action)}` : ""}`,
      {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}` },
      },
    );
    if (!response.ok) throw new Error(`Export failed (${response.status})`);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast("error", error instanceof Error ? error.message : "Could not export audit data");
  }
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <Card>
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold">{value?.toLocaleString() ?? "—"}</p>
    </Card>
  );
}

function Tour({ onComplete }: { onComplete(): void }) {
  const [open, setOpen] = useState(() => localStorage.getItem("product-tour-complete") !== "1");
  if (!open) return null;
  return (
    <Card title="Start here">
      <ol className="grid gap-3 text-sm sm:grid-cols-3">
        <li>
          <strong>1. Observe</strong>
          <br />
          Review live totals, risk, and audit evidence.
        </li>
        <li>
          <strong>2. Operate</strong>
          <br />
          Create approvals, invites, keys, webhooks, and reports.
        </li>
        <li>
          <strong>3. Govern</strong>
          <br />
          Simulate access and keep decisions auditable.
        </li>
      </ol>
      <Button
        type="button"
        className="mt-4"
        onClick={() => {
          localStorage.setItem("product-tour-complete", "1");
          setOpen(false);
          onComplete();
        }}
      >
        Finish guided tour
      </Button>
    </Card>
  );
}

function RealtimePanel() {
  const toast = useToast();
  const socket = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Array<{ from?: string; text?: string; type: string }>>([]);
  async function connect() {
    try {
      const info = await secureRequest<{ wsUrl: string }>("/info");
      const token = getAccessToken();
      if (!token) throw new Error("authentication required");
      const ws = new WebSocket(info.wsUrl, ["jwt", token]);
      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ type: "room:join", room: "lobby" }));
      };
      ws.onmessage = (event) => {
        try {
          setMessages((items) => [...items.slice(-49), JSON.parse(event.data as string)]);
        } catch {
          /* invalid frames are ignored */
        }
      };
      ws.onclose = () => setConnected(false);
      socket.current = ws;
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "Realtime connection failed");
    }
  }
  function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || socket.current?.readyState !== WebSocket.OPEN) return;
    socket.current.send(JSON.stringify({ type: "message:send", room: "lobby", text: text.slice(0, 1000) }));
    setText("");
  }
  return (
    <Card title="Realtime presence, broadcast, and chat">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {connected ? "Connected to the lobby" : "Connect to exchange live messages with online users."}
        </p>
        <Button type="button" variant="ghost" onClick={() => void connect()} disabled={connected}>
          {connected ? "Connected" : "Connect"}
        </Button>
      </div>
      <ul className="my-4 max-h-44 overflow-auto rounded-xl border border-[var(--color-line)] p-3 text-sm">
        {messages.map((message, index) => (
          <li key={`${message.type}-${index}`}>
            <strong>{message.from ?? message.type}:</strong> {message.text}
          </li>
        ))}
      </ul>
      <form onSubmit={send} className="flex gap-2">
        <Input
          disabled={!connected}
          maxLength={1000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Broadcast or chat message"
        />
        <Button disabled={!connected}>Send</Button>
      </form>
    </Card>
  );
}
