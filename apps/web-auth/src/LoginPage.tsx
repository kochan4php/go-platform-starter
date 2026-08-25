import { Alert, Button, Card, Field, Input } from "@starter/ui";
import { type FormEvent, useState } from "react";
import { login } from "./api";

export interface SessionPayload {
  accessToken: string;
  user: { id: string; email: string; perms?: string[]; ver?: number };
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
    <Card title="Log in">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Email">
          <Input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {error ? <Alert message={error} /> : null}
        <Button type="submit" disabled={busy}>
          Log in
        </Button>
      </form>
      <p className="mt-4 text-sm text-[var(--color-muted)]">
        No account?{" "}
        <a href="/register" className="underline">
          Register
        </a>{" "}
        ·{" "}
        <a href="/forgot" className="underline">
          Forgot password
        </a>
      </p>
    </Card>
  );
}

function claimsOf(jwt: string): { perms: string[]; ver: number } {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return { perms: [], ver: 0 };
    const payload = JSON.parse(atob(parts[1])) as { perms?: string[]; ver?: number };
    return { perms: payload.perms ?? [], ver: payload.ver ?? 0 };
  } catch {
    return { perms: [], ver: 0 };
  }
}
