import { Alert, Button, Card, Field, Input } from "@starter/ui";
import { type FormEvent, useState } from "react";
import { register } from "./api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await register(email, password);
      setDone(true);
    } catch (err) {
      setError((err as Error).message || "registration failed");
    }
  }

  return (
    <Card title="Create an account">
      {done ? (
        <Alert kind="info" message="Account created — you can log in now." />
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password (min 8 chars)">
            <Input
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error ? <Alert message={error} /> : null}
          <Button type="submit">Register</Button>
        </form>
      )}
      <p className="mt-4 text-sm text-[var(--color-muted)]">
        <a href="/login" className="underline">
          Back to login
        </a>
      </p>
    </Card>
  );
}
