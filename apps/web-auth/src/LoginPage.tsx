import { Alert, Button, Card, Field, Input } from "@starter/ui";
import { type FormEvent, useState } from "react";
import AuthFrame from "./AuthFrame";
import { login } from "./api";

export interface SessionPayload {
  accessToken: string;
  user: { id: number; email: string; perms?: string[]; ver?: number };
}

export default function LoginPage({ onLoggedIn }: { onLoggedIn(u: SessionPayload): void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await login(email, password);
      // Claims arrive with the token; the UI decodes them as a hint only.
      // Routing stays the host's business — it decides where to land next.
      onLoggedIn({
        accessToken: res.accessToken,
        user: { ...res.user, ...claimsOf(res.accessToken) },
      });
    } catch (err) {
      setError((err as Error).message || "invalid credentials or request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame>
      <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">
        Welcome back
      </p>
      <h1 className="max-w-5xl text-[clamp(2.75rem,4.6vw,5rem)] font-extrabold leading-[1.02] tracking-tight">
        Run the whole platform
        <br />
        from one quiet room.
      </h1>

      <div className="mt-12 max-w-md">
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error ? <Alert message={error} /> : null}
            <div className="flex items-center justify-between pt-1">
              <Button type="submit" disabled={busy}>
                Log in
                <span aria-hidden>{busy ? "…" : "→"}</span>
              </Button>
              <a
                href="/forgot"
                className="text-sm text-[var(--color-muted)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
              >
                Forgot password
              </a>
            </div>
          </form>
        </Card>
        <p className="mt-5 text-sm text-[var(--color-muted)]">
          No account?{" "}
          <a href="/register" className="text-[var(--color-ink)] underline-offset-4 hover:underline">
            Register
          </a>
        </p>
      </div>
    </AuthFrame>
  );
}

function claimsOf(jwt: string): { perms: string[]; ver: number } {
  const parts = jwt.split(".");
  if (parts.length < 2) return { perms: [], ver: 0 };
  try {
    const payload = JSON.parse(atob(parts[1])) as { perms?: string[]; ver?: number };
    return { perms: payload.perms ?? [], ver: payload.ver ?? 0 };
  } catch {
    return { perms: [], ver: 0 };
  }
}
