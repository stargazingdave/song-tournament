import type { FormEvent } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  memberName: string; invitation: string; claimExisting: boolean; busy: boolean; error: string;
  onMemberNameChange: (value: string) => void;
  onInvitationChange: (value: string) => void;
  onClaimExistingChange: (value: boolean) => void;
  onCreateMember: (event: FormEvent) => void;
  onLogout: () => void;
};

export function IdentityScreen(props: Props) {
  return <main className="shell identity-page">
    <section className="topbar">
      <div><p className="eyebrow">Set up your app profile</p><h1>Join Song Tournament</h1></div>
      <Button variant="outline" onClick={props.onLogout} disabled={props.busy}><LogOut data-icon="inline-start" aria-hidden="true" /> Log out</Button>
    </section>
    <form className="panel stack auth-form" onSubmit={props.onCreateMember}>
      <p>Your shared account is ready. Join the band room with its invitation code and your own member name.</p>
      <label>Member name
        <input value={props.memberName} autoComplete="nickname" maxLength={100} required
          onChange={event => props.onMemberNameChange(event.target.value)} disabled={props.busy} />
      </label>
      <label>Band invitation code
        <input type="password" value={props.invitation} required autoComplete="off"
          onChange={event => props.onInvitationChange(event.target.value)} disabled={props.busy} />
      </label>
      <label className="checkbox-label">
        <input type="checkbox" checked={props.claimExisting} disabled={props.busy}
          onChange={event => props.onClaimExistingChange(event.target.checked)} />
        Link my existing band identity and keep my votes (enter its exact name above)
      </label>
      <p className="muted">The invitation code is the band password used before individual accounts were introduced. An existing identity can be linked once.</p>
      {props.error && <p className="error" role="alert">{props.error}</p>}
      <Button disabled={props.busy}>{props.busy ? "Joining…" : "Join Song Tournament"}</Button>
    </form>
  </main>;
}
