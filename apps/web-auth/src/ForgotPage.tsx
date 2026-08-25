import { Alert, Button, Card, Field, Input } from "@starter/ui";
import { type FormEvent, useState } from "react";
import AuthFrame from "./AuthFrame";
import { forgot } from "./api";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  // Uniform response server-side: this screen never reveals whether the
  // address exists (anti-enumeration, PLAN item 14).
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await forgot(email);
    } finally {
      setSent(true);
    }
  }

  return (
    <AuthFrame>
      <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent)]">
        Recover access
      </p>
      <h1 className="max-w-5xl text-[clamp(2.75rem,4.6vw,5rem)] font-extrabold leading-[1.02] tracking-tight">
        Locked out?
        <br />
        Happens to everyone.
      </h1>

      <div className="mt-12 max-w-md">
        <Card>
          {sent ? (
            <Alert kind="info" message="If that address exists, a reset link is on its way." />
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
              <Button type="submit">Send reset link</Button>
            </form>
          )}
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
