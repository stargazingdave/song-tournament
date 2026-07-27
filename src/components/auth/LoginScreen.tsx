import type { FormEvent } from "react";
import { Music2 } from "lucide-react";

type Props = {
  password: string;
  busy: boolean;
  error: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function LoginScreen({ password, busy, error, onPasswordChange, onSubmit }: Props) {
  return (
    <main className="login-page">
      <section className="login-panel">
        <Music2 aria-hidden="true" />
        <h1>Band Song Selector</h1>
        <p>Enter the shared band password to manage songs, votes, polls, and the chosen set.</p>
        <form onSubmit={onSubmit} className="stack">
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Shared password"
            disabled={busy}
          />
          <button className="primary" disabled={busy}>Enter</button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
