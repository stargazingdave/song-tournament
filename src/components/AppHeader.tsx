import { LogOut, Music2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props = {
  children?: React.ReactNode;
  memberName: string;
  busy: boolean;
  onLogout: () => void;
};

export function AppHeader({
  memberName,
  children,
  busy,
  onLogout,
}: Props) {
  return (
    <header className="topbar">
      <Link href="/bands" className="brand" aria-label="Song Tournament home">
        <span className="brand-mark">
          <Music2 aria-hidden="true" />
        </span>
        <div>
          <strong>Song Tournament</strong>
        </div>
      </Link>
      <div className="session-actions">
        {children}
        <span className="member-chip">
          <UserRound aria-hidden="true" /> {memberName}
        </span>
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
