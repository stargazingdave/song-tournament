import type { FormEvent } from "react";
import { useState } from "react";
import {
  ArrowUpDown, BarChart3, ChevronLeft, ChevronRight, Medal, Pencil, Play, Plus, Star, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import type { AppState } from "@/lib/types";

type Poll = AppState["polls"][number];
type PollEntry = Poll["songs"][number];
type PlayingSong = { pollId: string; songId: string };
type PollSortKey = "score" | "votes" | "title" | "artist";
type Props = {
  songs: AppState["songs"];
  polls: Poll[];
  busy: boolean;
  onCreate: () => void;
  onEdit: (poll: Poll) => void;
  onDelete: (pollId: string) => void;
  onScore: (pollId: string, songId: string, score: number | null) => void;
};

type PollDialogProps = {
  songs: AppState["songs"];
  title: string;
  selectedSongIds: string[];
  editingPollId: string | null;
  open: boolean;
  busy: boolean;
  onTitleChange: (value: string) => void;
  onSelectedSongIdsChange: (ids: string[]) => void;
  onSave: (event: FormEvent) => void;
  onOpenChange: (open: boolean) => void;
};

export function PollDialog({
  songs, title, selectedSongIds, editingPollId, open, busy, onTitleChange,
  onSelectedSongIdsChange, onSave, onOpenChange
}: PollDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingPollId ? "Edit poll" : "Create a poll"}</DialogTitle>
          <DialogDescription>Give it a clear name and choose the songs everyone should score.</DialogDescription>
        </DialogHeader>
        <form className="dialog-form" onSubmit={onSave}>
          <label>Poll title<input autoFocus value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="e.g. Songs for next rehearsal" disabled={busy} required /></label>
          <fieldset className="poll-options">
            <legend>Songs <span>{selectedSongIds.length} selected</span></legend>
            <div className="poll-option-list">
              {songs.map((song) => (
                <label key={song.id}>
                  <Checkbox
                    checked={selectedSongIds.includes(song.id)}
                    onCheckedChange={(checked) => onSelectedSongIdsChange(
                      checked === true
                        ? [...selectedSongIds, song.id]
                        : selectedSongIds.filter((songId) => songId !== song.id)
                    )}
                  />
                  <span>{song.title}<small>{song.artist || "Unknown artist"}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button disabled={busy || !selectedSongIds.length}>{editingPollId ? "Save changes" : "Create poll"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PollsPanel({
  songs, polls, busy, onCreate, onEdit, onDelete, onScore
}: Props) {
  const [playingSong, setPlayingSong] = useState<PlayingSong | null>(null);
  const [resultsPollId, setResultsPollId] = useState<string | null>(null);
  const [pollSorts, setPollSorts] = useState<Record<string, PollSortKey>>({});
  const playingPoll = polls.find((poll) => poll.id === playingSong?.pollId) ?? null;
  const resultsPoll = polls.find((poll) => poll.id === resultsPollId) ?? null;

  const sortEntries = (entries: PollEntry[], sort: PollSortKey) => [...entries].sort((a, b) => {
    if (sort === "score") {
      return (b.average_score ?? -1) - (a.average_score ?? -1)
        || b.score_count - a.score_count
        || a.song.title.localeCompare(b.song.title);
    }
    if (sort === "votes") {
      return b.score_count - a.score_count
        || (b.average_score ?? -1) - (a.average_score ?? -1)
        || a.song.title.localeCompare(b.song.title);
    }
    if (sort === "artist") {
      return (a.song.artist ?? "").localeCompare(b.song.artist ?? "")
        || a.song.title.localeCompare(b.song.title);
    }
    return a.song.title.localeCompare(b.song.title);
  });

  const playingEntries = playingPoll
    ? sortEntries(playingPoll.songs, pollSorts[playingPoll.id] ?? "score")
    : [];
  const playingIndex = playingEntries.findIndex((entry) => entry.song.id === playingSong?.songId);
  const playingEntry = playingIndex >= 0 ? playingEntries[playingIndex] : null;
  const rankedResults = resultsPoll ? sortEntries(resultsPoll.songs, "score") : [];

  return (
    <section className="section-block polls-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Open polls</p>
          <h2>{polls.length ? "Your vote is needed" : "No open polls"}</h2>
        </div>
        <Button variant="outline" onClick={onCreate} disabled={busy || !songs.length}><Plus /> New poll</Button>
      </div>

      <div className="poll-list">
        {polls.map((poll) => (
          <article className="poll-card" key={poll.id}>
            <div className="poll-heading">
              <div>
                <h3>{poll.title}</h3>
                <p>{poll.songs.length} song{poll.songs.length === 1 ? "" : "s"} · Rate each from 1 to 5</p>
              </div>
              <div className="card-actions">
                <Button variant="ghost" size="icon" onClick={() => onEdit(poll)} disabled={busy} aria-label={`Edit ${poll.title}`}><Pencil /></Button>
                <Button variant="ghost" size="icon" className="danger" onClick={() => onDelete(poll.id)} disabled={busy} aria-label={`Delete ${poll.title}`}><Trash2 /></Button>
              </div>
            </div>
            <div className="poll-toolbar">
              <label className="sort-field poll-sort">
                <ArrowUpDown aria-hidden="true" />
                <select
                  value={pollSorts[poll.id] ?? "score"}
                  onChange={(event) => setPollSorts((current) => ({
                    ...current,
                    [poll.id]: event.target.value as PollSortKey
                  }))}
                  aria-label={`Sort songs in ${poll.title}`}
                >
                  <option value="score">Top rated</option>
                  <option value="votes">Most ratings</option>
                  <option value="title">Song title</option>
                  <option value="artist">Artist</option>
                </select>
              </label>
              <Button variant="outline" onClick={() => setResultsPollId(poll.id)}>
                <BarChart3 /> View results
              </Button>
            </div>
            <div className="score-list">
              {sortEntries(poll.songs, pollSorts[poll.id] ?? "score").map((entry) => (
                <div className="score-row" key={entry.poll_song_id}>
                  <div className="score-song">
                    {entry.song.youtube_video_id ? (
                      <Button
                        variant="outline"
                        size="icon"
                        className="poll-play"
                        onClick={() => setPlayingSong({ pollId: poll.id, songId: entry.song.id })}
                        aria-label={`Play ${entry.song.title}`}
                      >
                        <Play />
                      </Button>
                    ) : null}
                    <div className="score-copy">
                      <strong>{entry.song.title}</strong>
                      <span>{entry.song.artist || "Unknown artist"}</span>
                    </div>
                  </div>
                  <div className="rating">
                    <div className="rating-scale">
                      <span aria-hidden="true">1</span>
                      <div className="stars" aria-label={`Rate ${entry.song.title} from 1 to 5`}>
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            type="button"
                            key={score}
                            className={entry.current_member_score && score <= entry.current_member_score ? "star active" : "star"}
                            onClick={() => onScore(poll.id, entry.song.id, entry.current_member_score === score ? null : score)}
                            disabled={busy}
                            aria-label={`${score} star${score === 1 ? "" : "s"}`}
                            aria-pressed={entry.current_member_score === score}
                          >
                            <Star aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                      <span aria-hidden="true">5</span>
                    </div>
                    <span className={entry.average_score ? "poll-result has-score" : "poll-result"}>
                      {entry.average_score ? <strong>{entry.average_score.toFixed(1)}</strong> : "—"}
                      <span>{entry.average_score ? "average" : "Not rated"} · {entry.score_count} vote{entry.score_count === 1 ? "" : "s"}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
        {!polls.length ? (
          <div className="empty-state compact"><BarChart3 /><div><h3>Nothing to vote on right now</h3><p>Select songs from the bank below to start a poll.</p></div></div>
        ) : null}
      </div>

      <Dialog open={Boolean(resultsPoll)} onOpenChange={(open) => !open && setResultsPollId(null)}>
        <DialogContent className="results-dialog">
          <DialogHeader>
            <DialogTitle>{resultsPoll?.title} results</DialogTitle>
            <DialogDescription>
              Ranked by average rating, with the number of submitted ratings shown for context.
            </DialogDescription>
          </DialogHeader>
          <div className="results-summary">
            {rankedResults.map((entry, index) => (
              <div className="result-row" key={entry.poll_song_id}>
                <span className={index < 3 ? `result-rank rank-${index + 1}` : "result-rank"}>
                  {index < 3 ? (
                    <><Medal aria-hidden="true" /><span className="sr-only">Rank {index + 1}</span></>
                  ) : index + 1}
                </span>
                <div className="result-song">
                  <strong>{entry.song.title}</strong>
                  <span>{entry.song.artist || "Unknown artist"}</span>
                </div>
                <div className="result-score">
                  <strong>{entry.average_score ? entry.average_score.toFixed(1) : "—"}</strong>
                  <span>{entry.score_count} rating{entry.score_count === 1 ? "" : "s"}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(playingEntry)} onOpenChange={(open) => !open && setPlayingSong(null)}>
        <DialogContent className="player-dialog">
          <DialogHeader>
            <DialogTitle>{playingEntry?.song.title}</DialogTitle>
            <DialogDescription>
              {playingEntry?.song.artist || "Unknown artist"} · {playingPoll?.title}
            </DialogDescription>
          </DialogHeader>
          {playingEntry?.song.youtube_video_id ? (
            <div className="video-frame">
              <iframe
                title={`Play ${playingEntry.song.title}`}
                src={`https://www.youtube.com/embed/${playingEntry.song.youtube_video_id}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
          {playingEntry && playingPoll ? (
            <div className="player-review">
              <div className="player-rating">
                <div>
                  <span>Your rating</span>
                  <small>
                    {playingEntry.average_score ? `${playingEntry.average_score.toFixed(1)} average` : "No ratings yet"}
                    {" · "}{playingEntry.score_count} vote{playingEntry.score_count === 1 ? "" : "s"}
                  </small>
                </div>
                <div className="rating-scale large-scale">
                  <span aria-hidden="true">1</span>
                  <div className="stars large" aria-label={`Rate ${playingEntry.song.title} from 1 to 5`}>
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        type="button"
                        key={score}
                        className={playingEntry.current_member_score && score <= playingEntry.current_member_score ? "star active" : "star"}
                        onClick={() => onScore(
                          playingPoll.id,
                          playingEntry.song.id,
                          playingEntry.current_member_score === score ? null : score
                        )}
                        disabled={busy}
                        aria-label={`${score} star${score === 1 ? "" : "s"}`}
                        aria-pressed={playingEntry.current_member_score === score}
                      >
                        <Star aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <span aria-hidden="true">5</span>
                </div>
              </div>
              <div className="player-navigation">
                <Button
                  variant="outline"
                  onClick={() => setPlayingSong({
                    pollId: playingPoll.id,
                    songId: playingEntries[playingIndex - 1].song.id
                  })}
                  disabled={playingIndex <= 0}
                >
                  <ChevronLeft /> Previous
                </Button>
                <span>{playingIndex + 1} of {playingEntries.length}</span>
                <Button
                  variant="outline"
                  onClick={() => setPlayingSong({
                    pollId: playingPoll.id,
                    songId: playingEntries[playingIndex + 1].song.id
                  })}
                  disabled={playingIndex >= playingEntries.length - 1}
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
