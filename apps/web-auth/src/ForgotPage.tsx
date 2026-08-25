import { Alert, Button, Card, Field, Input } from "@starter/ui";
import { type FormEvent, useState } from "react";
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
    <Card title="Forgot password">
      {sent ? (
        <Alert kind="info" message="If that address exists, a reset link is on its way." />
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit">Send reset link</Button>
        </form>
      )}
    </Card>
  );
}
