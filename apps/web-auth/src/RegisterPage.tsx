import { Alert, Button, Card, Field, Input } from "@starter/ui";
import { type FormEvent, useState } from "react";
import AuthFrame from "./AuthFrame";
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
    <AuthFrame>
      <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">New here</p>
      <h1 className="max-w-5xl text-[clamp(2.75rem,4.6vw,5rem)] font-extrabold leading-[1.02] tracking-tight">
        Claim your seat.
      </h1>

      <div className="mt-12 max-w-md">
        <Card>
          {done ? (
            <Alert kind="info" message="Account created — you can log in now." />
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Email">
                <Input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Password (min 8 chars)">
                <Input
                  type="password"
                  name="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              {error ? <Alert message={error} /> : null}
              <Button type="submit">Create account</Button>
            </form>
          )}
        </Card>
        <p className="mt-5 text-sm text-[var(--color-muted)]">
          Already registered?{" "}
          <a href="/login" className="text-[var(--color-ink)] underline-offset-4 hover:underline">
            Back to login
          </a>
        </p>
      </div>
    </AuthFrame>
  );
}
