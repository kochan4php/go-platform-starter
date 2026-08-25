import { Alert, Button, Card, Field, Input } from "@starter/ui";
import { type FormEvent, useState } from "react";
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
    <Card title="Reset password">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Reset token">
          <Input value={token} onChange={(e) => setToken(e.target.value)} required />
        </Field>
        <Field label="New password (min 8 chars)">
          <Input
            type="password"
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
      <p className="mt-4 text-sm text-[var(--color-muted)]">
        <a href="/login" className="underline">
          Back to login
        </a>
      </p>
    </Card>
  );
}
