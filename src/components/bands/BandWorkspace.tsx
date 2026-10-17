"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  ListMusic,
  Music2,
  RefreshCw,
  Settings,
  Users,
  Vote,
} from "lucide-react";
import { useBandSession } from "./BandSession";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { api } from "@/lib/client-api";
import type { Band } from "@/lib/types";

export function bandStatus(band: Band, userId: string) {
  if (band.membership_status === "active")
    return band.owner_user_id === userId ? "Owner" : "Member";
  return {
    pending: "Awaiting approval",
    migration_required: "Import required",
    rejected: "Request declined",
    removed: "Membership ended",
  }[band.membership_status];
}

export function BandWorkspace({ children }: { children: ReactNode }) {
  const { state, busy, run } = useBandSession();
  const { bandId } = useParams<{ bandId: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const band = state.bands.find((band) => band.id === bandId);
  if (!band || state.selectedBandId !== bandId)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Band unavailable</EmptyTitle>
          <EmptyDescription>
            This band may have been deleted, or you may need to request access
            with its current code.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/bands">Back to your bands</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  const base = "/bands/" + band.id;
  const owner = band.owner_user_id === state.profile?.user_id;
  const links = [
    { path: "", label: "Overview", icon: LayoutDashboard },
    { path: "/songs", label: "Songs", icon: Music2 },
    { path: "/polls", label: "Polls", icon: Vote },
    { path: "/sets", label: "Sets", icon: ListMusic },
    { path: "/members", label: "Members", icon: Users },
    ...(owner
      ? [{ path: "/settings", label: "Settings", icon: Settings }]
      : []),
  ];
  return (
    <>
      <Link href="/bands" className="back-link">
        <ArrowLeft aria-hidden="true" />
        Your bands
      </Link>
      <div className="workspace-heading">
        <div className="stack">
          <div className="inline-meta">
            <span className="eyebrow">Band workspace</span>
            <Badge>{bandStatus(band, state.profile!.user_id)}</Badge>
          </div>
          <h1 dir="auto">{band.name}</h1>
        </div>
        <div className="workspace-tools">
          {state.bands.length > 1 && (
            <label className="sr-only" htmlFor="workspace-band">
              Switch band
            </label>
          )}
          {state.bands.length > 1 && (
            <select
              id="workspace-band"
              value={band.id}
              disabled={busy}
              onChange={(event) => {
                const nextBand = state.bands.find(
                  (band) => band.id === event.target.value,
                );
                const suffix = pathname.slice(base.length).startsWith("/sets/")
                  ? "/sets"
                  : pathname.slice(base.length);
                const nextSection =
                  suffix === "/settings" &&
                  nextBand?.owner_user_id !== state.profile?.user_id
                    ? ""
                    : suffix;
                router.push("/bands/" + event.target.value + nextSection);
              }}
            >
              {state.bands.map((band) => (
                <option key={band.id} value={band.id}>
                  {band.name}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void run(async () => {})}
          >
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>
      {band.membership_status === "active" ? (
        <>
          <nav className="workspace-nav" aria-label="Band navigation">
            {links.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                href={base + path}
                aria-current={
                  pathname === base + path ||
                  (path === "/sets" && pathname.startsWith(base + "/sets/"))
                    ? "page"
                    : undefined
                }
              >
                <Icon aria-hidden="true" />
                {label}
                {path === "/members" && state.joinRequests.length > 0 && (
                  <Badge>{state.joinRequests.length}</Badge>
                )}
              </Link>
            ))}
          </nav>
          <div className="workspace-content" key={band.id}>
            {children}
          </div>
        </>
      ) : (
        <BandAccess key={band.id} band={band} />
      )}
    </>
  );
}

function BandAccess({ band }: { band: Band }) {
  const { state, busy, run } = useBandSession();
  const [memberId, setMemberId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  if (band.membership_status === "migration_required")
    return (
      <Card className="narrow-card">
        <CardHeader>
          <CardTitle>Bring your existing data with you</CardTitle>
          <CardDescription>
            Your request is approved. Choose your old member profile before
            entering this band.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await api("/api/bands/" + band.id + "/import", {
                  method: "POST",
                  body: JSON.stringify({ memberId, confirmed }),
                });
              });
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="legacy-member">Existing member</FieldLabel>
                <select
                  id="legacy-member"
                  required
                  value={memberId}
                  disabled={busy}
                  onChange={(event) => {
                    setMemberId(event.target.value);
                    setConfirmed(false);
                  }}
                >
                  <option value="" disabled>
                    Select your existing member
                  </option>
                  {state.legacyOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Alert variant="warning">
                <AlertTitle>This decision is permanent and final</AlertTitle>
                <AlertDescription>
                  The selected member’s votes, scores, and song attribution will
                  move to your account. Their old member record will be deleted
                  and will no longer be available to anyone else.
                </AlertDescription>
              </Alert>
              <Field>
                <FieldLabel className="checkbox-label">
                  <input
                    type="checkbox"
                    required
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                    disabled={busy}
                  />
                  I understand that this choice is permanent and final.
                </FieldLabel>
              </Field>
              <Button disabled={busy || !memberId || !confirmed}>
                Confirm permanent migration and enter band
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    );
  const pending = band.membership_status === "pending";
  return (
    <Card className="narrow-card">
      <CardHeader>
        <CardTitle>
          {pending
            ? "Your request is with the owner"
            : band.membership_status === "rejected"
              ? "Your request was declined"
              : "Your membership has ended"}
        </CardTitle>
        <CardDescription>
          {pending
            ? "You’ll be able to enter after the owner approves your request. Refresh this page to check for an update."
            : "You can request access again using the band’s current code."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pending ? (
          <Button disabled={busy} onClick={() => void run(async () => {})}>
            Check approval status
          </Button>
        ) : (
          <Button asChild>
            <Link href="/bands/join">Request access again</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
