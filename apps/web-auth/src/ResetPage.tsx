import { Alert, Button, Card, Field, Input } from "@starter/ui";
import { type FormEvent, useState } from "react";
import AuthFrame from "./AuthFrame";
import { reset } from "./api";

export default function ResetPage() {
  const params = new URLSearchParams(window.location.search);
  const [token, setToken] = useState(params.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await reset(token, newPassword);
      setDone(true);
    } catch (err) {
      setError((err as Error).message || "reset failed");
    }
  }

  return (
    <AuthFrame>
      <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">
        One last step
      </p>
      <h1 className="max-w-5xl text-[clamp(2.75rem,4.6vw,5rem)] font-extrabold leading-[1.02] tracking-tight">
        Set it once,
        <br />
        remember it twice.
      </h1>

      <div className="mt-12 max-w-md">
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Reset token">
              <Input name="token" value={token} onChange={(e) => setToken(e.target.value)} required />
            </Field>
            <Field label="New password (min 8 chars)">
              <Input
                type="password"
                name="newPassword"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Field>
            {error ? <Alert message={error} /> : null}
            {done ? <Alert kind="info" message="Password updated — all sessions were signed out." /> : null}
            <Button type="submit">Set new password</Button>
          </form>
        </Card>
        <p className="mt-5 text-sm text-[var(--color-muted)]">
          <a href="/login" className="text-[var(--color-ink)] underline-offset-4 hover:underline">
            Back to login
          </a>
        </p>
      </div>
    </AuthFrame>
  );
}
