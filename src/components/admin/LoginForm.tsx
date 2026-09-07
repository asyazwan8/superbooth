"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, Input } from "@/components/admin/ui";

/**
 * Sign-in for the backend.
 *
 * With Firebase configured this signs in against Firebase Auth and posts the
 * resulting ID token to the server, which checks the allowlist and sets an
 * httpOnly session cookie. Without Firebase — local development only — the
 * attendant PIN stands in, and the form says so plainly rather than quietly
 * looking like real auth.
 */
export function LoginForm({ mode }: { mode: "firebase" | "pin" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      let body: Record<string, string>;

      if (mode === "firebase") {
        // Imported lazily so the Firebase SDK never loads for the kiosk.
        const { firebaseAuth } = await import("@/lib/firebase/client");
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        const credential = await signInWithEmailAndPassword(firebaseAuth(), email, password);
        body = { idToken: await credential.user.getIdToken() };
      } else {
        body = { pin };
      }

      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Sign-in failed.");

      router.replace("/admin");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Sign-in failed.";
      // Firebase error codes are useless to a human; map the common ones.
      setError(
        /auth\/(invalid-credential|wrong-password|user-not-found|invalid-email)/.test(message)
          ? "That email and password combination was not recognised."
          : message,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-sm p-6">
      <form onSubmit={submit} className="space-y-4">
        {mode === "firebase" ? (
          <>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                autoComplete="username"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>
          </>
        ) : (
          <>
            <Field
              label="Attendant PIN"
              hint="Firebase Auth is not configured, so the backend is using the local PIN. See SETUP.md before deploying."
            >
              <Input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                required
              />
            </Field>
          </>
        )}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <Button type="submit" tone="primary" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}
