"use client";

import Link from "next/link";
import { ArrowRight, Music2, Plus, Ticket } from "lucide-react";
import type { AppState } from "@/lib/types";
import { bandStatus } from "@/components/bands/BandWorkspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export function BandsHome({ state, prefetch }: { state: AppState; prefetch?: false }) {
  const active = state.bands.filter(
    (band) => band.membership_status === "active",
  );
  const other = state.bands.filter(
    (band) => band.membership_status !== "active",
  );
  function cards(bands: typeof state.bands) {
    return (
      <div className="band-card-grid">
        {bands.map((band) => (
          <Card key={band.id}>
            <CardHeader>
              <div className="band-card-mark">
                <Music2 aria-hidden="true" />
                <Badge>{bandStatus(band, state.profile!.user_id)}</Badge>
              </div>
              <CardTitle dir="auto">{band.name}</CardTitle>
              <CardDescription>
                {band.membership_status === "active"
                  ? "Your songs, polls, sets, and band members."
                  : band.membership_status === "migration_required"
                    ? "You’re approved. Import your existing data to get started."
                    : band.membership_status === "pending"
                      ? "Waiting for the band owner to approve your request."
                      : "Request access again with the current band code."}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline">
                <Link prefetch={prefetch} href={"/bands/" + band.id}>
                  {band.membership_status === "active"
                    ? "Open band"
                    : band.membership_status === "migration_required"
                      ? "Complete setup"
                      : "View request"}
                  <ArrowRight data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  return (
    <div className="management-page">
      <div className="management-heading">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h1>Your bands</h1>
          <p className="section-description">
            Make music together. Keep each band’s songs, sets, and people in one
            place.
          </p>
        </div>
        <div className="form-actions">
          <Button asChild variant="outline">
            <Link prefetch={prefetch} href="/bands/join">
              <Ticket data-icon="inline-start" aria-hidden="true" />
              Join a band
            </Link>
          </Button>
          <Button asChild>
            <Link prefetch={prefetch} href="/bands/new">
              <Plus data-icon="inline-start" aria-hidden="true" />
              Create a band
            </Link>
          </Button>
        </div>
      </div>
      {active.length > 0 && (
        <section className="management-section">
          <div className="section-heading">
            <h2>
              Your bands <Badge>{active.length}</Badge>
            </h2>
          </div>
          {cards(active)}
        </section>
      )}
      {other.length > 0 && (
        <section className="management-section">
          <h2>Requests & setup</h2>
          {cards(other)}
        </section>
      )}
      {!state.bands.length && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Your first band starts here</EmptyTitle>
            <EmptyDescription>
              Create a band to start collecting songs, or join an existing band
              with a code from its owner.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link prefetch={prefetch} href="/bands/new">Create your first band</Link>
            </Button>
            <Button asChild variant="outline">
              <Link prefetch={prefetch} href="/bands/join">I have a band code</Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
