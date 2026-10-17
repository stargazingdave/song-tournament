"use client";

import Link from "next/link";
import { ArrowRight, ListMusic, Plus } from "lucide-react";
import { useBandSession } from "@/components/bands/BandSession";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export function SetsIndex() {
  const { state } = useBandSession();
  const base = `/bands/${state.selectedBandId}/sets`;
  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sets</p>
          <h2>
            Your set lists <Badge>{state.sets.length}</Badge>
          </h2>
          <p className="section-description">
            Open a set to view its songs, running order, and notes.
          </p>
        </div>
        {state.canManageSets && (
          <Button asChild>
            <Link href={base + "/new"}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              New set
            </Link>
          </Button>
        )}
      </div>
      {state.sets.length ? (
        <ul className="set-index-list" aria-label="Set lists">
          {state.sets.map((set) => (
            <li key={set.id}>
              <Link href={base + "/" + set.id} className="set-index-row">
                <span className="set-index-icon">
                  <ListMusic aria-hidden="true" />
                </span>
                <span className="set-index-copy">
                  <strong dir="auto">{set.name}</strong>
                  <span>View songs and running order</span>
                </span>
                <ArrowRight aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No sets yet</EmptyTitle>
            <EmptyDescription>
              {state.canManageSets
                ? "Create a named set for your next rehearsal or show."
                : "Your band’s sets will appear here once someone creates one."}
            </EmptyDescription>
          </EmptyHeader>
          {state.canManageSets && (
            <EmptyContent>
              <Button asChild>
                <Link href={base + "/new"}>Create your first set</Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      )}
    </section>
  );
}
