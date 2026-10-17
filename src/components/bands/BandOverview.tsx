"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Copy,
  ListMusic,
  Music2,
  RefreshCw,
  Users,
  Vote,
} from "lucide-react";
import { useBandSession } from "./BandSession";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/client-api";

export function BandOverview() {
  const { state, busy, run } = useBandSession();
  const [message, setMessage] = useState("");
  const band = state.bands.find((band) => band.id === state.selectedBandId)!;
  const base = "/bands/" + band.id;
  const owner = band.owner_user_id === state.profile?.user_id;
  const stats = [
    { label: "Songs", count: state.songs.length, href: "/songs", icon: Music2 },
    { label: "Polls", count: state.polls.length, href: "/polls", icon: Vote },
    { label: "Sets", count: state.sets.length, href: "/sets", icon: ListMusic },
    {
      label: "Members",
      count: state.people.length,
      href: "/members",
      icon: Users,
    },
  ];
  return (
    <div className="management-page">
      <div className="section-heading">
        <div>
          <h2>Band overview</h2>
          <p className="section-description">
            Everything your band is working on, together.
          </p>
        </div>
      </div>
      <div className="band-stats">
        {stats.map(({ label, count, href, icon: Icon }) => (
          <Link href={base + href} key={label} className="band-stat">
            <Icon aria-hidden="true" />
            <strong>{count}</strong>
            <span>{label}</span>
            <ArrowRight aria-hidden="true" />
          </Link>
        ))}
      </div>
      {owner && state.joinRequests.length > 0 && (
        <Alert>
          <AlertTitle>
            {state.joinRequests.length} join{" "}
            {state.joinRequests.length === 1
              ? "request needs"
              : "requests need"}{" "}
            your review
          </AlertTitle>
          <AlertDescription>
            Review requests on the Members page before new people can enter your
            band.
          </AlertDescription>
          <Button asChild variant="outline" size="sm">
            <Link href={base + "/members"}>
              Review requests
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Link>
          </Button>
        </Alert>
      )}
      <div className="overview-grid">
        {owner && (
          <Card>
            <CardHeader>
              <CardTitle>Invite your bandmates</CardTitle>
              <CardDescription>
                Share the code below. You approve each request before anyone can
                access your band.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="invite-code">Band code</FieldLabel>
                  <input
                    id="invite-code"
                    className="invite-code"
                    readOnly
                    value={state.bandCode ?? ""}
                    onFocus={(event) => event.target.select()}
                  />
                  <FieldDescription>
                    Only you can see or rotate this code.
                  </FieldDescription>
                </Field>
                <div className="form-actions">
                  <Button
                    disabled={!state.bandCode}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(state.bandCode!);
                        setMessage("Band code copied.");
                      } catch {
                        setMessage("Select the code above and copy it.");
                      }
                    }}
                  >
                    <Copy data-icon="inline-start" aria-hidden="true" />
                    Copy code
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await run(async () => {
                          await api("/api/bands/" + band.id + "/code", {
                            method: "POST",
                            body: "{}",
                          });
                        })
                      )
                        setMessage(
                          "New code generated. The previous code no longer works.",
                        );
                    }}
                  >
                    <RefreshCw data-icon="inline-start" aria-hidden="true" />
                    Generate new code
                  </Button>
                </div>
                {message && (
                  <p role="status" className="muted">
                    {message}
                  </p>
                )}
              </FieldGroup>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>
              {owner ? "People & permissions" : "Your bandmates"}
            </CardTitle>
            <CardDescription>
              {owner
                ? "Approve new people and decide who can manage other members’ songs, polls, and sets."
                : "See who’s in your band. Everyone can add songs, create polls, and manage their own contributions."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="band-avatars" aria-hidden="true">
              {state.people.slice(0, 6).map((person) => (
                <span key={person.user_id}>
                  {person.display_name.slice(0, 1).toLocaleUpperCase()}
                </span>
              ))}
            </div>
            <p className="muted">
              {state.people.length}{" "}
              {state.people.length === 1 ? "member" : "members"} in this band
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href={base + "/members"}>
                {owner ? "Manage members" : "View members"}
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
