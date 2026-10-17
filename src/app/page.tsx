"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { IdentityScreen } from "@/components/auth/IdentityScreen";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { ChosenSongsPanel } from "@/components/chosen/ChosenSongsPanel";
import { PollDialog, PollsPanel } from "@/components/polls/PollsPanel";
import { SongBank, type SongForm } from "@/components/songs/SongBank";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/client-api";
import type { AppState, VoteValue } from "@/lib/types";

const emptyState: AppState = {
  authenticated: false,
  selectedMemberId: null,
  members: [],
  songs: [],
  polls: [],
  chosenSongs: [],
};

const emptySongForm: SongForm = { title: "", artist: "", youtubeUrl: "" };

export default function Home() {
  const [state, setState] = useState<AppState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [memberName, setMemberName] = useState("");
  const [invitation, setInvitation] = useState("");
  const [claimExisting, setClaimExisting] = useState(false);
  const [songForm, setSongForm] = useState<SongForm>(emptySongForm);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [songDialogOpen, setSongDialogOpen] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollSongIds, setPollSongIds] = useState<string[]>([]);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [chosenSongId, setChosenSongId] = useState("");
  const [chosenNote, setChosenNote] = useState("");

  const currentMember = useMemo(
    () =>
      state.members.find((member) => member.id === state.selectedMemberId) ??
      null,
    [state.members, state.selectedMemberId],
  );
  const availableChosenSongs = state.songs.filter((song) => !song.is_chosen);
  const hasOpenPolls = state.polls.length > 0;

  async function refresh() {
    setState(await api<AppState>("/api/state"));
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
      return true;
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Something went wrong.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh()
      .catch((nextError) =>
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Could not load app.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await run(async () => {
      await api("/api/logout", { method: "POST" });
      setState(emptyState);
    });
  }

  async function createMember(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      await api("/api/members", {
        method: "POST",
        body: JSON.stringify({ name: memberName, invitation, claimExisting }),
      });
      setMemberName("");
      setInvitation("");
    });
  }

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
      await api("/api/chosen", {
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
        await api("/api/chosen", {
          method: "POST",
          body: JSON.stringify({ songId, note: "" }),
        });
      }
    });
  }

  async function moveChosen(id: string, direction: -1 | 1) {
    const orderedIds = state.chosenSongs.map((chosen) => chosen.id);
    const index = orderedIds.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) return;
    [orderedIds[index], orderedIds[nextIndex]] = [
      orderedIds[nextIndex],
      orderedIds[index],
    ];
    await run(() =>
      api("/api/chosen/reorder", {
        method: "PUT",
        body: JSON.stringify({ orderedIds }),
      }),
    );
  }

  const deleteResource = (path: string) =>
    run(() => api(path, { method: "DELETE" }));

  if (loading)
    return (
      <main className="shell centered">
        <div className="loader">Loading the band room...</div>
      </main>
    );

  if (!state.authenticated) {
    return (
      <LoginScreen onAuthenticated={refresh} />
    );
  }

  if (!currentMember) {
    return (
      <IdentityScreen
        memberName={memberName}
        invitation={invitation}
        claimExisting={claimExisting}
        busy={busy}
        error={error}
        onMemberNameChange={setMemberName}
        onInvitationChange={setInvitation}
        onClaimExistingChange={setClaimExisting}
        onCreateMember={createMember}
        onLogout={logout}
      />
    );
  }

  return (
    <main className="shell">
      <AppHeader
        memberName={currentMember.name}
        busy={busy}
        onLogout={logout}
      />
      <div className="page-content">
        {error ? <p className="error">{error}</p> : null}
        <Tabs
          key={hasOpenPolls ? "with-polls" : "without-polls"}
          defaultValue={hasOpenPolls ? "polls" : "songs"}
        >
          <TabsList aria-label="Song Tournament sections">
            {hasOpenPolls ? (
              <TabsTrigger value="polls">
                Polls <span className="tab-count">{state.polls.length}</span>
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="songs">Songs</TabsTrigger>
            <TabsTrigger value="winners">
              Winners{" "}
              <span className="tab-count">{state.chosenSongs.length}</span>
            </TabsTrigger>
          </TabsList>
          {hasOpenPolls ? (
            <TabsContent value="polls">
              <PollsPanel
                songs={state.songs}
                polls={state.polls}
                busy={busy}
                onCreate={() => startPollCreate()}
                onEdit={startPollEdit}
                onDelete={(id) => deleteResource(`/api/polls/${id}`)}
                onScore={scorePollSong}
              />
            </TabsContent>
          ) : null}
          <TabsContent value="songs">
            <SongBank
              songs={availableChosenSongs}
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
          </TabsContent>
          <TabsContent value="winners">
            <ChosenSongsPanel
              chosenSongs={state.chosenSongs}
              availableSongs={availableChosenSongs}
              songId={chosenSongId}
              note={chosenNote}
              busy={busy}
              onSongIdChange={setChosenSongId}
              onNoteChange={setChosenNote}
              onAdd={addChosen}
              onMove={moveChosen}
              onDelete={(id) => deleteResource(`/api/chosen/${id}`)}
            />
          </TabsContent>
        </Tabs>
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
      </div>
    </main>
  );
}
