"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { useBandSession } from "@/components/bands/BandSession";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/client-api";

export function CreateSet() {
  const { state, busy, run } = useBandSession();
  const [name, setName] = useState("");
  const router = useRouter();
  const base = `/bands/${state.selectedBandId}/sets`;
  return (
    <div className="section-block">
      <Link className="back-link" href={base}>
        <ArrowLeft aria-hidden="true" />
        All sets
      </Link>
      {!state.canManageSets ? (
        <Alert>
          <AlertDescription>
            You don’t have permission to create sets in this band.
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="narrow-card">
          <CardHeader>
            <CardTitle>Create a set</CardTitle>
            <CardDescription>
              Give this set a name, then add songs from your band’s song bank.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                let setId = "";
                if (
                  await run(async () => {
                    const result = await api<{ setId: string }>("/api/sets", {
                      method: "POST",
                      body: JSON.stringify({ name }),
                    });
                    setId = result.setId;
                  })
                )
                  router.push(base + "/" + setId);
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="new-set-name">Set name</FieldLabel>
                  <input
                    id="new-set-name"
                    autoFocus
                    required
                    maxLength={100}
                    placeholder="e.g. Friday night"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={busy}
                  />
                </Field>
                <div>
                  <Button disabled={busy || !name.trim()}>
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    Create set
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
