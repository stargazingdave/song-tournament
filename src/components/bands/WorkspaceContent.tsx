"use client";

import { useState, type FormEvent } from "react";
import { useBandSession } from "@/components/bands/BandSession";
import { SetsPanel } from "@/components/sets/SetsPanel";
import { PollDialog, PollsPanel } from "@/components/polls/PollsPanel";
import { SongBank, type SongForm } from "@/components/songs/SongBank";
import { api, selectApiSet } from "@/lib/client-api";
import type { AppState, VoteValue } from "@/lib/types";

const emptySongForm: SongForm = { title: "", artist: "", youtubeUrl: "" };

export function WorkspaceContent({
  section,
}: {
  section: "songs" | "polls" | "sets";
}) {
  const { state, busy, run } = useBandSession();
  const [songForm, setSongForm] = useState<SongForm>(emptySongForm);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollSongIds, setPollSongIds] = useState<string[]>([]);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [chosenSongId, setChosenSongId] = useState("");
  const [chosenNote, setChosenNote] = useState("");

  const availableChosenSongs = state.songs.filter((song) => !song.is_in_set);

  function startSongEdit(song: AppState["songs"][number]) {
    setEditingSongId(song.id);
    setSongForm({
      title: song.title,
      artist: song.artist ?? "",
      youtubeUrl: song.youtube_url ?? "",
    });
    setSongDialogOpen(true);
  }

  function startSongAdd() {
    setEditingSongId(null);
    setSongForm(emptySongForm);
    setSongDialogOpen(true);
  }

  function setSongDialog(open: boolean) {
    setSongDialogOpen(open);
    if (!open) {
      setEditingSongId(null);
      setSongForm(emptySongForm);
    }
  }

  async function saveSong(event: FormEvent) {
    event.preventDefault();
    const saved = await run(async () => {
      await api(editingSongId ? `/api/songs/${editingSongId}` : "/api/songs", {
        method: editingSongId ? "PATCH" : "POST",
        body: JSON.stringify(songForm),
      });
    });
    if (saved) setSongDialog(false);
  }

  async function voteSong(songId: string, vote: VoteValue | null) {
    await run(() =>
      api(`/api/songs/${songId}/vote`, {
        method: "PUT",
        body: JSON.stringify({ vote }),
      }),
    );
  }

  function startPollEdit(poll: AppState["polls"][number]) {
    setEditingPollId(poll.id);
    setPollTitle(poll.title);
    setPollSongIds(poll.songs.map((entry) => entry.song.id));
    setPollDialogOpen(true);
  }

  function startPollCreate(songIds: string[] = []) {
    setEditingPollId(null);
    setPollTitle("");
    setPollSongIds(songIds);
    setPollDialogOpen(true);
  }

  function setPollDialog(open: boolean) {
    setPollDialogOpen(open);
    if (!open) {
      setEditingPollId(null);
      setPollTitle("");
      setPollSongIds([]);
    }
  }

  async function savePoll(event: FormEvent) {
    event.preventDefault();
    const saved = await run(async () => {
      await api(editingPollId ? `/api/polls/${editingPollId}` : "/api/polls", {
        method: editingPollId ? "PATCH" : "POST",
        body: JSON.stringify({ title: pollTitle, songIds: pollSongIds }),
      });
    });
    if (saved) setPollDialog(false);
  }

  async function scorePollSong(
    pollId: string,
    songId: string,
    score: number | null,
  ) {
    await run(() =>
      api(`/api/polls/${pollId}/scores`, {
        method: "PUT",
        body: JSON.stringify({ songId, score }),
      }),
    );
  }

  async function addChosen(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api(`/api/sets/${state.selectedSetId}/songs`, {
        method: "POST",
        body: JSON.stringify({ songId: chosenSongId, note: chosenNote }),
      });
      setChosenSongId("");
      setChosenNote("");
    });
  }

  async function addSelectedChosen(songIds: string[]) {
    return run(async () => {
      for (const songId of songIds) {
        await api(`/api/sets/${state.selectedSetId}/songs`, {
          method: "POST",
          body: JSON.stringify({ songId, note: "" }),
        });
      }
    });
  }

  async function moveChosen(id: string, direction: -1 | 1) {
    const orderedIds = state.setSongs.map((chosen) => chosen.id);
    const index = orderedIds.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) return;
    [orderedIds[index], orderedIds[nextIndex]] = [
      orderedIds[nextIndex],
      orderedIds[index],
    ];
    await run(() =>
      api(`/api/sets/${state.selectedSetId}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ orderedIds }),
      }),
    );
  }

  const deleteResource = (path: string) =>
    run(() => api(path, { method: "DELETE" }));

  return (
    <>
      {section === "polls" && (
        <PollsPanel
          songs={state.songs}
          polls={state.polls}
          busy={busy}
          onCreate={() => startPollCreate()}
          onEdit={startPollEdit}
          onDelete={(id) => deleteResource(`/api/polls/${id}`)}
          onScore={scorePollSong}
        />
      )}
      {section === "songs" && (
        <SongBank
          songs={state.songs}
          canManageSets={state.canManageSets && !!state.selectedSetId}
          form={songForm}
          editingSongId={editingSongId}
          dialogOpen={songDialogOpen}
          busy={busy}
          onFormChange={setSongForm}
          onSave={saveSong}
          onDialogOpenChange={setSongDialog}
          onAdd={startSongAdd}
          onEdit={startSongEdit}
          onDelete={(id) => deleteResource(`/api/songs/${id}`)}
          onVote={voteSong}
          onCreatePoll={startPollCreate}
          onAddToChosen={addSelectedChosen}
        />
      )}
      {section === "sets" && (
        <SetsPanel
          key={state.selectedSetId ?? "no-set"}
          state={state}
          availableSongs={availableChosenSongs}
          songId={chosenSongId}
          note={chosenNote}
          busy={busy}
          onSongIdChange={setChosenSongId}
          onNoteChange={setChosenNote}
          onAdd={addChosen}
          onMove={moveChosen}
          onDelete={(id) =>
            deleteResource(`/api/sets/${state.selectedSetId}/songs/${id}`)
          }
          onSelect={(id) => {
            selectApiSet(id);
            setChosenSongId("");
            setChosenNote("");
            void run(async () => {});
          }}
          onCreate={(name) =>
            run(async () => {
              const result = await api<{ setId: string }>("/api/sets", {
                method: "POST",
                body: JSON.stringify({ name }),
              });
              selectApiSet(result.setId);
            })
          }
          onRename={(name) =>
            run(async () => {
              await api(`/api/sets/${state.selectedSetId}`, {
                method: "PATCH",
                body: JSON.stringify({ name }),
              });
            })
          }
          onDeleteSet={() =>
            run(async () => {
              await api(`/api/sets/${state.selectedSetId}`, {
                method: "DELETE",
              });
              selectApiSet(null);
            })
          }
        />
      )}
      <PollDialog
        songs={state.songs}
        title={pollTitle}
        selectedSongIds={pollSongIds}
        editingPollId={editingPollId}
        open={pollDialogOpen}
        busy={busy}
        onTitleChange={setPollTitle}
        onSelectedSongIdsChange={setPollSongIds}
        onSave={savePoll}
        onOpenChange={setPollDialog}
      />
    </>
  );
}
