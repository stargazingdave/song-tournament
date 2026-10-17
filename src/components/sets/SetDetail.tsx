"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useBandSession } from "@/components/bands/BandSession";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { api } from "@/lib/client-api";

export function SetDetail() {
  const { setId } = useParams<{ setId: string }>();
  return <SetContent key={setId} setId={setId} />;
}

function SetContent({ setId }: { setId: string }) {
  const { state, busy, run } = useBandSession();
  const router = useRouter();
  const [songId, setSongId] = useState("");
  const [note, setNote] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const set = state.sets.find((set) => set.id === setId);
  const base = `/bands/${state.selectedBandId}/sets`;
  const endpoint = `/api/sets/${setId}`;
  const availableSongs = state.songs.filter(
    (song) => !state.setSongs.some((entry) => entry.song_id === song.id),
  );

  if (!set || state.selectedSetId !== setId)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Set unavailable</EmptyTitle>
          <EmptyDescription>
            This set may have been deleted, or it may belong to another band.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href={base}>Back to sets</Link>
          </Button>
        </EmptyContent>
      </Empty>
    );

  async function move(id: string, direction: -1 | 1) {
    const orderedIds = state.setSongs.map((entry) => entry.id);
    const index = orderedIds.indexOf(id),
      target = index + direction;
    if (index < 0 || target < 0 || target >= orderedIds.length) return;
    [orderedIds[index], orderedIds[target]] = [
      orderedIds[target],
      orderedIds[index],
    ];
    await run(async () => {
      await api(endpoint + "/reorder", {
        method: "PUT",
        body: JSON.stringify({ orderedIds }),
      });
    });
  }

  return (
    <section className="section-block set-detail">
      <Link href={base} className="back-link">
        <ArrowLeft aria-hidden="true" />
        All sets
      </Link>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Set list</p>
          <h2 dir="auto">{set.name}</h2>
          <p className="section-description">
            {state.setSongs.length}{" "}
            {state.setSongs.length === 1 ? "song" : "songs"} · Songs stay in
            your band’s song bank.
          </p>
        </div>
        {state.canManageSets && (
          <div className="form-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setRenaming(!renaming);
                setName(set.name);
                setDeleting(false);
              }}
            >
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Rename
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setDeleting(!deleting);
                setConfirmation("");
                setRenaming(false);
              }}
            >
              <Trash2 data-icon="inline-start" aria-hidden="true" />
              Delete set
            </Button>
          </div>
        )}
      </div>
      {state.canManageSets && renaming && (
        <Card>
          <CardHeader>
            <CardTitle>Rename set</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (
                  await run(async () => {
                    await api(endpoint, {
                      method: "PATCH",
                      body: JSON.stringify({ name }),
                    });
                  })
                )
                  setRenaming(false);
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="set-name">Set name</FieldLabel>
                  <input
                    id="set-name"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={busy}
                  />
                </Field>
                <div className="form-actions">
                  <Button disabled={busy || !name.trim()}>Save name</Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setRenaming(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}
      {state.canManageSets && deleting && (
        <Card className="danger-card">
          <CardHeader>
            <CardTitle>Permanently delete this set?</CardTitle>
            <CardDescription>
              This removes the set’s order and notes. The songs remain in your
              song bank. Type the exact set name to confirm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (
                  await run(async () => {
                    await api(endpoint, { method: "DELETE" });
                  })
                )
                  router.replace(base);
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="confirm-set-name">
                    Confirm set name: {set.name}
                  </FieldLabel>
                  <input
                    id="confirm-set-name"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    disabled={busy}
                    autoComplete="off"
                  />
                </Field>
                <div className="form-actions">
                  <Button
                    variant="destructive"
                    disabled={busy || confirmation !== set.name}
                  >
                    Permanently delete set
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setDeleting(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}
      {state.canManageSets && (
        <form
          className="set-add-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await api(endpoint + "/songs", {
                method: "POST",
                body: JSON.stringify({ songId, note }),
              });
              setSongId("");
              setNote("");
            });
          }}
        >
          <FieldGroup className="set-add-fields">
            <Field>
              <FieldLabel htmlFor="set-song">Song to add</FieldLabel>
              <select
                id="set-song"
                required
                value={songId}
                onChange={(event) => setSongId(event.target.value)}
                disabled={busy || !availableSongs.length}
              >
                <option value="">
                  {availableSongs.length
                    ? "Choose a song from the bank"
                    : "No more songs to add"}
                </option>
                {availableSongs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.title} — {song.artist || "Unknown artist"}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="set-note">Note (optional)</FieldLabel>
              <input
                id="set-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={busy}
                placeholder="e.g. Acoustic intro"
              />
            </Field>
            <Button disabled={busy || !songId}>
              <Plus data-icon="inline-start" aria-hidden="true" />
              Add song
            </Button>
          </FieldGroup>
        </form>
      )}
      {state.setSongs.length ? (
        <ol className="set-track-list">
          {state.setSongs.map((entry, index) => (
            <li className="chosen-row" key={entry.id}>
              <span className="winner-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="winner-copy">
                <h3>{entry.song.title}</h3>
                <p>
                  {entry.song.artist || "Unknown artist"}
                  {entry.note ? " · " + entry.note : ""}
                </p>
              </div>
              {state.canManageSets && (
                <div className="chosen-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy || index === 0}
                    aria-label={`Move ${entry.song.title} up`}
                    onClick={() => void move(entry.id, -1)}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy || index === state.setSongs.length - 1}
                    aria-label={`Move ${entry.song.title} down`}
                    onClick={() => void move(entry.id, 1)}
                  >
                    <ChevronDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={`Remove ${entry.song.title} from set`}
                    onClick={() =>
                      void run(async () => {
                        await api(endpoint + "/songs/" + entry.id, {
                          method: "DELETE",
                        });
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No songs in this set yet</EmptyTitle>
            <EmptyDescription>
              {state.canManageSets
                ? "Add songs above, or choose this set when adding songs from the song bank."
                : "Songs added to this set will appear here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
