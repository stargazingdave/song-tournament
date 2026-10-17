"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck, UserPlus, X } from "lucide-react";
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
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/client-api";
import type { BandPerson } from "@/lib/types";

export function BandMembers() {
  const { state, busy, run } = useBandSession();
  const router = useRouter();
  const [removeId, setRemoveId] = useState<string | null>(null);
  const band = state.bands.find((band) => band.id === state.selectedBandId)!;
  const owner = band.owner_user_id === state.profile?.user_id;
  async function permissions(
    person: BandPerson,
    key: "songs" | "polls" | "sets",
    checked: boolean,
  ) {
    await run(async () => {
      await api("/api/bands/" + band.id + "/people", {
        method: "PATCH",
        body: JSON.stringify({
          userId: person.user_id,
          songs: person.can_manage_others_songs,
          polls: person.can_manage_others_polls,
          sets: person.can_manage_sets,
          [key]: checked,
        }),
      });
    });
  }
  return (
    <div className="management-page">
      {owner && (
        <Card>
          <CardHeader>
            <div className="inline-meta">
              <UserPlus aria-hidden="true" />
              <CardTitle>Join requests</CardTitle>
              <Badge>{state.joinRequests.length}</Badge>
            </div>
            <CardDescription>
              Approve people you recognize. A request alone gives no access to
              your band.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!state.joinRequests.length ? (
              <p className="muted">
                You’re all caught up. New requests will appear here.
              </p>
            ) : (
              <div className="request-list">
                {state.joinRequests.map((request) => (
                  <div className="request-row" key={request.user_id}>
                    <div>
                      <strong>{request.display_name}</strong>
                      <p className="muted">
                        Requested{" "}
                        {new Date(request.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="form-actions">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api("/api/bands/" + band.id + "/requests", {
                              method: "POST",
                              body: JSON.stringify({
                                userId: request.user_id,
                                approve: true,
                              }),
                            });
                          })
                        }
                      >
                        <Check data-icon="inline-start" aria-hidden="true" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api("/api/bands/" + band.id + "/requests", {
                              method: "POST",
                              body: JSON.stringify({
                                userId: request.user_id,
                                approve: false,
                              }),
                            });
                          })
                        }
                      >
                        <X data-icon="inline-start" aria-hidden="true" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <div className="section-heading">
        <div>
          <h2>
            Band members <Badge>{state.people.length}</Badge>
          </h2>
          <p className="section-description">
            Everyone can add songs, create polls, and edit or delete their own
            songs and polls.
          </p>
        </div>
      </div>
      <div className="member-card-list">
        {state.people.map((person) => (
          <Card key={person.user_id}>
            <CardHeader>
              <div className="member-card-heading">
                <div className="inline-meta">
                  <span className="person-avatar" aria-hidden="true">
                    {person.display_name.slice(0, 1).toLocaleUpperCase()}
                  </span>
                  <div>
                    <CardTitle>
                      {person.display_name}
                      {person.user_id === state.profile?.user_id
                        ? " (you)"
                        : ""}
                    </CardTitle>
                    <p className="muted">
                      {person.user_id === band.owner_user_id
                        ? "Band owner · Full access"
                        : person.state === "migration_required"
                          ? "Approved · Waiting to import existing data"
                          : "Band member"}
                    </p>
                  </div>
                </div>
                {person.user_id === band.owner_user_id ? (
                  <Badge>
                    <ShieldCheck aria-hidden="true" />
                    Owner
                  </Badge>
                ) : (
                  owner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        setRemoveId(
                          removeId === person.user_id ? null : person.user_id,
                        )
                      }
                    >
                      Remove member
                    </Button>
                  )
                )}
              </div>
            </CardHeader>
            {owner && person.user_id !== band.owner_user_id && (
              <CardContent>
                <FieldSet disabled={busy}>
                  <FieldLegend>
                    Additional permissions · Changes save automatically
                  </FieldLegend>
                  <FieldGroup className="permission-grid">
                    {(
                      [
                        [
                          "songs",
                          "Manage others’ songs",
                          "Edit or delete songs added by other members.",
                          person.can_manage_others_songs,
                        ],
                        [
                          "polls",
                          "Manage others’ polls",
                          "Edit or delete polls created by other members.",
                          person.can_manage_others_polls,
                        ],
                        [
                          "sets",
                          "Manage sets",
                          "Create and manage sets, including their songs and order.",
                          person.can_manage_sets,
                        ],
                      ] as const
                    ).map(([key, label, description, checked]) => (
                      <Field key={key}>
                        <FieldLabel className="permission-option">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              void permissions(
                                person,
                                key,
                                event.target.checked,
                              )
                            }
                          />
                          <span>
                            <strong>{label}</strong>
                            <small>{description}</small>
                          </span>
                        </FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                </FieldSet>
                {removeId === person.user_id && (
                  <Alert variant="warning">
                    <AlertDescription>
                      Remove {person.display_name} from this band? They’ll lose
                      access. Their existing contributions remain.
                    </AlertDescription>
                    <div className="form-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => setRemoveId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={async () => {
                          if (
                            await run(async () => {
                              await api("/api/bands/" + band.id + "/people", {
                                method: "DELETE",
                                body: JSON.stringify({
                                  userId: person.user_id,
                                }),
                              });
                            })
                          )
                            setRemoveId(null);
                        }}
                      >
                        Confirm removal
                      </Button>
                    </div>
                  </Alert>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
      {!owner && (
        <Card>
          <CardHeader>
            <CardTitle>Leave this band</CardTitle>
            <CardDescription>
              You’ll lose access until the owner approves a new request. Your
              existing contributions stay with the band.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {removeId !== state.profile?.user_id ? (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setRemoveId(state.profile!.user_id)}
              >
                Leave band
              </Button>
            ) : (
              <Alert variant="warning">
                <AlertDescription>
                  Are you sure you want to leave {band.name}?
                </AlertDescription>
                <div className="form-actions">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setRemoveId(null)}
                  >
                    Stay in band
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await run(async () => {
                          await api("/api/bands/" + band.id + "/people", {
                            method: "DELETE",
                            body: JSON.stringify({
                              userId: state.profile!.user_id,
                            }),
                          });
                        })
                      )
                        router.push("/bands");
                    }}
                  >
                    Confirm leaving
                  </Button>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
