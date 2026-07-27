import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  ArrowDownUp, Check, ChevronLeft, ChevronRight, ListMusic, Pencil, Play, Plus,
  Search, Trash2, Trophy, Vote, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import type { AppState, VoteValue } from "@/lib/types";

export type SongForm = { title: string; artist: string; youtubeUrl: string };
type Song = AppState["songs"][number];
type SortKey = "score" | "newest" | "title" | "artist";

type Props = {
  songs: Song[];
  form: SongForm;
  editingSongId: string | null;
  dialogOpen: boolean;
  busy: boolean;
  onFormChange: (form: SongForm) => void;
  onSave: (event: FormEvent) => void;
  onDialogOpenChange: (open: boolean) => void;
  onAdd: () => void;
  onEdit: (song: Song) => void;
  onDelete: (songId: string) => void;
  onVote: (songId: string, vote: VoteValue | null) => void;
  onCreatePoll: (songIds: string[]) => void;
  onAddToChosen: (songIds: string[]) => Promise<boolean>;
};

export function SongBank({
  songs, form, editingSongId, dialogOpen, busy, onFormChange, onSave, onDialogOpenChange,
  onAdd, onEdit, onDelete, onVote, onCreatePoll, onAddToChosen
}: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);

  const visibleSongs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return songs
      .filter((song) => !normalized || `${song.title} ${song.artist ?? ""}`.toLowerCase().includes(normalized))
      .sort((a, b) => {
        if (sort === "score") return (b.yes_count - b.no_count) - (a.yes_count - a.no_count);
        if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sort === "artist") return (a.artist ?? "").localeCompare(b.artist ?? "");
        return a.title.localeCompare(b.title);
      });
  }, [songs, query, sort]);
  const playingIndex = visibleSongs.findIndex((song) => song.id === playingSongId);
  const playingSong = playingIndex >= 0 ? visibleSongs[playingIndex] : null;

  function toggleSong(songId: string, checked: boolean) {
    setSelectedIds((current) => checked ? [...current, songId] : current.filter((id) => id !== songId));
  }

  async function addSelectedToChosen() {
    if (await onAddToChosen(selectedIds)) setSelectedIds([]);
  }

  return (
    <section className="section-block">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Song bank</p>
          <h2>{songs.length} song{songs.length === 1 ? "" : "s"} in the running</h2>
        </div>
        <Button onClick={onAdd} disabled={busy}><Plus /> Add song</Button>
      </div>

      <div className="bank-toolbar">
        <label className="search-field">
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs or artists" />
        </label>
        <label className="sort-field">
          <ArrowDownUp aria-hidden="true" />
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} aria-label="Sort songs">
            <option value="score">Top votes</option>
            <option value="newest">Newest</option>
            <option value="title">Title A–Z</option>
            <option value="artist">Artist A–Z</option>
          </select>
        </label>
      </div>

      {selectedIds.length ? (
        <div className="selection-bar">
          <span><strong>{selectedIds.length}</strong> selected</span>
          <div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>Clear</Button>
            <Button variant="outline" size="sm" onClick={addSelectedToChosen} disabled={busy}>
              <Trophy /> Add to winners
            </Button>
            <Button size="sm" onClick={() => onCreatePoll(selectedIds)}><Vote /> Create poll</Button>
          </div>
        </div>
      ) : null}

      <div className="song-list">
        {visibleSongs.map((song) => {
          const selected = selectedIds.includes(song.id);
          const score = song.yes_count - song.no_count;
          return (
            <article className={selected ? "song-row selected" : "song-row"} key={song.id}>
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => toggleSong(song.id, checked === true)}
                aria-label={`Select ${song.title}`}
              />
              <div className="song-main">
                <div className="song-copy">
                  <h3>{song.title}</h3>
                  <p>{song.artist || "Unknown artist"} <span>· Added by {song.added_by_name || "someone"}</span></p>
                </div>
                <span className={score > 0 ? "score positive" : score < 0 ? "score negative" : "score"}>
                  {score > 0 ? "+" : ""}{score}
                </span>
              </div>
              <div className="song-actions">
                {song.youtube_video_id ? (
                  <Button variant="ghost" size="icon" onClick={() => setPlayingSongId(song.id)} aria-label={`Play ${song.title}`}>
                    <Play />
                  </Button>
                ) : null}
                <Button
                  variant="outline" size="sm"
                  className={song.current_member_vote === "yes" ? "vote-yes" : ""}
                  onClick={() => onVote(song.id, song.current_member_vote === "yes" ? null : "yes")}
                  disabled={busy}
                ><Check /> {song.yes_count}</Button>
                <Button
                  variant="outline" size="sm"
                  className={song.current_member_vote === "no" ? "vote-no" : ""}
                  onClick={() => onVote(song.id, song.current_member_vote === "no" ? null : "no")}
                  disabled={busy}
                ><X /> {song.no_count}</Button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(song)} disabled={busy} aria-label={`Edit ${song.title}`}><Pencil /></Button>
                <Button variant="ghost" size="icon" className="danger" onClick={() => onDelete(song.id)} disabled={busy} aria-label={`Delete ${song.title}`}><Trash2 /></Button>
              </div>
            </article>
          );
        })}
        {!visibleSongs.length ? (
          <div className="empty-state"><ListMusic /><h3>{songs.length ? "No matches" : "No songs yet"}</h3><p>{songs.length ? "Try a different search." : "Add the first contender to get started."}</p></div>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSongId ? "Edit song" : "Add a song"}</DialogTitle>
            <DialogDescription>{editingSongId ? "Update the song details." : "Add a contender to the shared song bank."}</DialogDescription>
          </DialogHeader>
          <form className="dialog-form" onSubmit={onSave}>
            <label>Song title<input autoFocus value={form.title} onChange={(e) => onFormChange({ ...form, title: e.target.value })} placeholder="e.g. Go Your Own Way" disabled={busy} required /></label>
            <label>Artist<input value={form.artist} onChange={(e) => onFormChange({ ...form, artist: e.target.value })} placeholder="e.g. Fleetwood Mac" disabled={busy} /></label>
            <label>YouTube link <span>(optional)</span><input value={form.youtubeUrl} onChange={(e) => onFormChange({ ...form, youtubeUrl: e.target.value })} placeholder="https://youtube.com/..." disabled={busy} /></label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onDialogOpenChange(false)}>Cancel</Button>
              <Button disabled={busy}>{editingSongId ? "Save changes" : "Add song"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(playingSong)} onOpenChange={(open) => !open && setPlayingSongId(null)}>
        <DialogContent className="player-dialog">
          <DialogHeader>
            <DialogTitle>{playingSong?.title}</DialogTitle>
            <DialogDescription>
              {playingSong?.artist || "Unknown artist"} · Added by {playingSong?.added_by_name || "someone"}
            </DialogDescription>
          </DialogHeader>
          {playingSong?.youtube_video_id ? (
            <div className="video-frame">
              <iframe
                title={`Play ${playingSong.title}`}
                src={`https://www.youtube.com/embed/${playingSong.youtube_video_id}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
          {playingSong ? (
            <div className="player-review">
              <div className="player-vote">
                <span>Would you play this song?</span>
                <div>
                  <Button
                    variant="outline"
                    className={playingSong.current_member_vote === "yes" ? "vote-yes" : ""}
                    onClick={() => onVote(
                      playingSong.id,
                      playingSong.current_member_vote === "yes" ? null : "yes"
                    )}
                    disabled={busy}
                  >
                    <Check /> Yes <strong>{playingSong.yes_count}</strong>
                  </Button>
                  <Button
                    variant="outline"
                    className={playingSong.current_member_vote === "no" ? "vote-no" : ""}
                    onClick={() => onVote(
                      playingSong.id,
                      playingSong.current_member_vote === "no" ? null : "no"
                    )}
                    disabled={busy}
                  >
                    <X /> No <strong>{playingSong.no_count}</strong>
                  </Button>
                </div>
              </div>
              <div className="player-navigation">
                <Button
                  variant="outline"
                  onClick={() => setPlayingSongId(visibleSongs[playingIndex - 1].id)}
                  disabled={playingIndex <= 0}
                >
                  <ChevronLeft /> Previous
                </Button>
                <span>{playingIndex + 1} of {visibleSongs.length}</span>
                <Button
                  variant="outline"
                  onClick={() => setPlayingSongId(visibleSongs[playingIndex + 1].id)}
                  disabled={playingIndex >= visibleSongs.length - 1}
                >
                  Next <ChevronRight />
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
