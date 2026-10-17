"use client";

import { useState, type FormEvent } from "react";
import { useBandSession } from "@/components/bands/BandSession";
import { PollDialog, PollsPanel } from "@/components/polls/PollsPanel";
import { SongBank, type SongForm } from "@/components/songs/SongBank";
import { api } from "@/lib/client-api";
import type { AppState, VoteValue } from "@/lib/types";

const emptySongForm: SongForm = { title: "", artist: "", youtubeUrl: "" };

export function WorkspaceContent({ section }: { section: "songs" | "polls" }) {
  const { state, busy, run } = useBandSession();
  const [songForm, setSongForm] = useState<SongForm>(emptySongForm);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollSongIds, setPollSongIds] = useState<string[]>([]);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
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

  async function addSelectedChosen(songIds: string[], setId: string) {
    return run(async () => {
      for (const songId of songIds) {
        await api(`/api/sets/${setId}/songs`, {
          method: "POST",
          body: JSON.stringify({ songId, note: "" }),
        });
      }
    });
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
          canManageSets={state.canManageSets && state.sets.length > 0}
          sets={state.sets}
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
