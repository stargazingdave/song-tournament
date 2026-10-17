"use client";

import { useState, type FormEvent } from "react";
import { Music2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";

type Mode = "login" | "signup" | "forgot" | "update";

export function LoginScreen({ onAuthenticated, initialMode = "login" }: {
  onAuthenticated: () => Promise<void>; initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function changeMode(next: Mode) { setMode(next); setPassword(""); setRepeat(""); setError(""); setMessage(""); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if ((mode === "signup" || mode === "update") && password !== repeat) throw new Error("Passwords do not match.");
      const result = await api<{ authenticated?: boolean }>("/api/" + ({
        login: "login", signup: "signup", forgot: "password/reset", update: "password/update",
      }[mode]), { method: "POST", body: JSON.stringify({ email, password, name }) });
      setPassword(""); setRepeat("");
      if (mode === "login" || mode === "update" || result.authenticated) await onAuthenticated();
      else if (mode === "signup") setMessage("Check your email to confirm your shared account, then sign in here to join Song Tournament. If you already have a Tasks account, use Sign in.");
      else setMessage("If an account exists for that email, you will receive password reset instructions.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not complete your request.");
    } finally { setBusy(false); }
  }
  const title = { login: "Sign in", signup: "Create a shared account", forgot: "Reset your password", update: "Choose a new password" }[mode];
  return <main className="login-page"><section className="login-panel">
    <Music2 aria-hidden="true" />
    <h1>Song Tournament</h1>
    <h2>{title}</h2>
    <p>Your account works across Tasks and Song Tournament. Each app has its own profile and setup.</p>
    <form onSubmit={submit} className="stack auth-form">
      {mode === "signup" && <label>Display name<input required maxLength={100} autoComplete="nickname" value={name} onChange={e => setName(e.target.value)} disabled={busy}/></label>}
      {mode !== "update" && <label>Email
        <input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy} />
      </label>}
      {mode !== "forgot" && <label>Password
        <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "login" ? undefined : 8} value={password}
          onChange={event => setPassword(event.target.value)} required disabled={busy} />
      </label>}
      {(mode === "signup" || mode === "update") && <label>Repeat password
        <input type="password" autoComplete="new-password" minLength={8} value={repeat}
          onChange={event => setRepeat(event.target.value)} required disabled={busy} />
      </label>}
      <Button disabled={busy}>{busy ? "Please wait…" : title}</Button>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <div className="stack">
      {mode !== "login" && <Button type="button" variant="outline" disabled={busy} onClick={() => changeMode("login")}>Sign in with an existing account</Button>}
      {mode === "login" && <>
        <Button type="button" variant="outline" disabled={busy} onClick={() => changeMode("signup")}>Create a shared account</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => changeMode("forgot")}>Forgot password?</Button>
      </>}
    </div>
  </section></main>;
}
