"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus, Ticket } from "lucide-react";
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
import { api } from "@/lib/client-api";

export function BandEntryForm({ mode }: { mode: "create" | "join" }) {
  const [value, setValue] = useState("");
  const { busy, run } = useBandSession();
  const router = useRouter();
  const create = mode === "create";
  const Icon = create ? Plus : Ticket;
  return (
    <div className="management-page">
      <Link href="/bands" className="back-link">
        <ArrowLeft aria-hidden="true" />
        Your bands
      </Link>
      <div className="entry-layout">
        <Card>
          <CardHeader>
            <p className="eyebrow">
              {create ? "A new workspace" : "Play together"}
            </p>
            <CardTitle as="h1">
              {create ? "Create a band" : "Join a band"}
            </CardTitle>
            <CardDescription>
              {create
                ? "Give your band a name. You’ll be its owner and can invite your bandmates next."
                : "Get the current band code from its owner. They’ll review your request before you can enter."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                let bandId = "";
                const success = await run(async () => {
                  const result = await api<{ bandId: string }>(
                    create ? "/api/bands" : "/api/bands/join",
                    {
                      method: "POST",
                      body: JSON.stringify(
                        create ? { name: value } : { code: value },
                      ),
                    },
                  );
                  bandId = result.bandId;
                });
                if (success) router.push("/bands/" + bandId);
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="band-entry">
                    {create ? "Band name" : "Band code"}
                  </FieldLabel>
                  <input
                    id="band-entry"
                    autoFocus
                    required
                    maxLength={create ? 100 : 64}
                    autoComplete="off"
                    placeholder={
                      create
                        ? "e.g. The Sunday Sessions"
                        : "Paste your invite code"
                    }
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    disabled={busy}
                  />
                  <FieldDescription>
                    {create
                      ? "You can change the name later in band settings."
                      : "Codes aren’t case-sensitive. Joining always requires owner approval."}
                  </FieldDescription>
                </Field>
                <Button disabled={busy || !value.trim()}>
                  <Icon data-icon="inline-start" aria-hidden="true" />
                  {busy
                    ? "Please wait…"
                    : create
                      ? "Create band"
                      : "Send join request"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
        <aside className="entry-aside">
          <h2>{create ? "Your band, your space" : "What happens next"}</h2>
          <ol className="entry-steps">
            {(create
              ? [
                  "Collect songs and run polls together.",
                  "Build named sets for rehearsals and shows.",
                  "Approve members and choose their permissions.",
                ]
              : [
                  "Send the owner your join request.",
                  "Wait for approval, then refresh your band page.",
                  "If asked, import your old member data before entering.",
                ]
            ).map((step) => (
              <li key={step}>
                <Check aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
