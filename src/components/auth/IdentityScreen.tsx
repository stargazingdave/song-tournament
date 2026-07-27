import type { FormEvent } from "react";
import { LogOut, Plus } from "lucide-react";
import type { Member } from "@/lib/types";

type Props = {
  members: Member[];
  memberName: string;
  busy: boolean;
  error: string;
  onMemberNameChange: (value: string) => void;
  onCreateMember: (event: FormEvent) => void;
  onSelectMember: (memberId: string) => void;
  onLogout: () => void;
};

export function IdentityScreen({
  members,
  memberName,
  busy,
  error,
  onMemberNameChange,
  onCreateMember,
  onSelectMember,
  onLogout
}: Props) {
  return (
    <main className="shell identity-page">
      <section className="topbar">
        <div>
          <p className="eyebrow">Private band space</p>
          <h1>Choose your identity</h1>
        </div>
        <button className="ghost" onClick={onLogout} disabled={busy}>
          <LogOut aria-hidden="true" /> Log out
        </button>
      </section>
      {error ? <p className="error">{error}</p> : null}
      <section className="identity-grid">
        <div className="panel">
          <h2>Members</h2>
          <div className="member-list">
            {members.length ? members.map((member) => (
              <button key={member.id} className="member-button" onClick={() => onSelectMember(member.id)}>
                {member.name}
              </button>
            )) : <p className="muted">No members yet. Create the first one.</p>}
          </div>
        </div>
        <form className="panel stack" onSubmit={onCreateMember}>
          <h2>Create member</h2>
          <input
            value={memberName}
            onChange={(event) => onMemberNameChange(event.target.value)}
            placeholder="Member name"
            disabled={busy}
          />
          <button className="primary" disabled={busy}>
            <Plus aria-hidden="true" /> Create and use
          </button>
        </form>
      </section>
    </main>
  );
}
