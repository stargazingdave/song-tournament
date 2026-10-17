import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";

export function IdentityScreen({ suggestedName, onComplete, onLogout }: {
  suggestedName: string; onComplete: () => Promise<void>; onLogout: () => void;
}) {
  const [name, setName] = useState(suggestedName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/api/profile", { method: "POST", body: JSON.stringify({ displayName: name }) }); await onComplete(); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not set up your profile."); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><section className="login-panel">
    <h1>Join Song Tournament</h1>
    <p>Choose the display name other band members will see. You can create or request access to bands next.</p>
    <form className="stack auth-form" onSubmit={submit}>
      <label>Display name<input required maxLength={100} autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} disabled={busy} /></label>
      {error && <p role="alert" className="error">{error}</p>}
      <Button disabled={busy}>Continue</Button>
      <Button type="button" variant="ghost" disabled={busy} onClick={onLogout}>Use a different account</Button>
    </form>
  </section></main>;
}
