"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBandSession } from "./BandSession";
import { Button } from "@/components/ui/button";
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
  FieldDescription,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/client-api";

export function BandSettings() {
  const { state, busy, run } = useBandSession();
  const router = useRouter();
  const band = state.bands.find((band) => band.id === state.selectedBandId)!;
  const [name, setName] = useState(band.name);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  if (band.owner_user_id !== state.profile?.user_id)
    return (
      <Alert>
        <AlertDescription>
          Only the band owner can change these settings.
        </AlertDescription>
      </Alert>
    );
  return (
    <div className="management-page settings-page">
      <Card>
        <CardHeader>
          <CardTitle>Band details</CardTitle>
          <CardDescription>
            The name your bandmates see throughout the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              if (
                await run(async () => {
                  await api("/api/bands/" + band.id, {
                    method: "PATCH",
                    body: JSON.stringify({ name }),
                  });
                })
              )
                setMessage("Band name updated.");
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="band-name">Band name</FieldLabel>
                <input
                  id="band-name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={busy}
                />
              </Field>
              <div>
                <Button
                  disabled={busy || !name.trim() || name.trim() === band.name}
                >
                  Save changes
                </Button>
              </div>
              {message && (
                <p className="muted" role="status">
                  {message}
                </p>
              )}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <Card className="danger-card">
        <CardHeader>
          <CardTitle>Delete band</CardTitle>
          <CardDescription>
            Permanently delete this band and all its songs, polls, sets, votes,
            and requests. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!deleting ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(true)}
            >
              Delete this band…
            </Button>
          ) : (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (
                  await run(async () => {
                    await api("/api/bands/" + band.id, {
                      method: "DELETE",
                      body: JSON.stringify({
                        confirmationName: confirmation,
                        confirmed,
                      }),
                    });
                  })
                )
                  router.replace("/bands");
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="delete-band-name">
                    Type the band name to confirm
                  </FieldLabel>
                  <input
                    id="delete-band-name"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                    disabled={busy}
                  />
                  <FieldDescription>
                    Type exactly: <strong dir="auto">{band.name}</strong>
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      disabled={busy}
                    />
                    I understand this deletion is permanent. My account and
                    other bands will remain.
                  </FieldLabel>
                </Field>
                <div className="form-actions">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setDeleting(false);
                      setConfirmed(false);
                      setConfirmation("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy || !confirmed || confirmation !== band.name}
                  >
                    Permanently delete band
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
