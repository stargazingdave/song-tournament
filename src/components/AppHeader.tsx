import { LogOut, Music2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  memberName: string;
  busy: boolean;
  onSwitchMember: () => void;
  onLogout: () => void;
};

export function AppHeader({
  memberName,
  busy,
  onSwitchMember,
  onLogout,
}: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Music2 aria-hidden="true" />
        </span>
        <div>
          <strong>Song Tournament</strong>
        </div>
      </div>
      <div className="session-actions">
        <span className="member-chip">
          <UserRound aria-hidden="true" /> {memberName}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSwitchMember}
          disabled={busy}
        >
          Switch
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          disabled={busy}
          aria-label="Log out"
        >
          <LogOut aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
