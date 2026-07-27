import type { FormEvent } from "react";
import { useState } from "react";
import { BarChart3, ChevronLeft, ChevronRight, Pencil, Play, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import type { AppState } from "@/lib/types";

type Poll = AppState["polls"][number];
type PlayingSong = { pollId: string; songId: string };
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
  const playingPoll = polls.find((poll) => poll.id === playingSong?.pollId) ?? null;
  const playingIndex = playingPoll?.songs.findIndex((entry) => entry.song.id === playingSong?.songId) ?? -1;
  const playingEntry = playingIndex >= 0 ? playingPoll?.songs[playingIndex] ?? null : null;

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
            <div className="score-list">
              {poll.songs.map((entry) => (
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
                    <div className="stars" aria-label={`Rate ${entry.song.title}`}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          type="button"
                          key={score}
                          className={entry.current_member_score === score ? "star active" : "star"}
                          onClick={() => onScore(poll.id, entry.song.id, entry.current_member_score === score ? null : score)}
                          disabled={busy}
                          aria-label={`${score} star${score === 1 ? "" : "s"}`}
                        >
                          <Star aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                    <span className="poll-result">{entry.average_score ? `${entry.average_score.toFixed(1)} avg` : "Not rated"} · {entry.score_count} vote{entry.score_count === 1 ? "" : "s"}</span>
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
                <div className="stars large" aria-label={`Rate ${playingEntry.song.title}`}>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      type="button"
                      key={score}
                      className={playingEntry.current_member_score === score ? "star active" : "star"}
                      onClick={() => onScore(
                        playingPoll.id,
                        playingEntry.song.id,
                        playingEntry.current_member_score === score ? null : score
                      )}
                      disabled={busy}
                      aria-label={`${score} star${score === 1 ? "" : "s"}`}
                    >
                      <Star aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="player-navigation">
                <Button
                  variant="outline"
                  onClick={() => setPlayingSong({
                    pollId: playingPoll.id,
                    songId: playingPoll.songs[playingIndex - 1].song.id
                  })}
                  disabled={playingIndex <= 0}
                >
                  <ChevronLeft /> Previous
                </Button>
                <span>{playingIndex + 1} of {playingPoll.songs.length}</span>
                <Button
                  variant="outline"
                  onClick={() => setPlayingSong({
                    pollId: playingPoll.id,
                    songId: playingPoll.songs[playingIndex + 1].song.id
                  })}
                  disabled={playingIndex >= playingPoll.songs.length - 1}
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
