import type { FormEvent } from "react";
import { ChevronDown, ChevronUp, Plus, Trophy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppState } from "@/lib/types";

type Props = {
  chosenSongs: AppState["chosenSongs"];
  availableSongs: AppState["songs"];
  songId: string;
  note: string;
  busy: boolean;
  onSongIdChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onAdd: (event: FormEvent) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
};

export function ChosenSongsPanel({
  chosenSongs, availableSongs, songId, note, busy, onSongIdChange, onNoteChange, onAdd, onMove, onDelete
}: Props) {
  return (
    <section className="section-block winners-panel">
      <div className="section-heading winners-heading">
        <div>
          <p className="eyebrow">Winners</p>
          <h2>The songs that made the cut</h2>
          <p className="section-description">Keep this list ordered for rehearsal or your final set.</p>
        </div>
        <Trophy aria-hidden="true" />
      </div>
      <form className="winner-form" onSubmit={onAdd}>
        <select value={songId} onChange={(e) => onSongIdChange(e.target.value)} disabled={busy || !availableSongs.length}>
          <option value="">Choose a song from the bank</option>
          {availableSongs.map((song) => <option key={song.id} value={song.id}>{song.title} — {song.artist || "Unknown artist"}</option>)}
        </select>
        <input value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="Optional note" disabled={busy} />
        <Button disabled={busy || !songId}><Plus /> Add winner</Button>
      </form>
      <div className="chosen-list">
        {chosenSongs.map((chosen, index) => (
          <article className="chosen-row" key={chosen.id}>
            <span className="winner-number">{String(index + 1).padStart(2, "0")}</span>
            <div className="winner-copy">
              <h3>{chosen.song.title}</h3>
              <p>{chosen.song.artist || "Unknown artist"}{chosen.note ? ` · ${chosen.note}` : ""}</p>
            </div>
            <div className="chosen-actions">
              <Button variant="ghost" size="icon" onClick={() => onMove(chosen.id, -1)} disabled={busy || index === 0} aria-label="Move up"><ChevronUp /></Button>
              <Button variant="ghost" size="icon" onClick={() => onMove(chosen.id, 1)} disabled={busy || index === chosenSongs.length - 1} aria-label="Move down"><ChevronDown /></Button>
              <Button variant="ghost" size="icon" className="danger" onClick={() => onDelete(chosen.id)} disabled={busy} aria-label="Remove winner"><Trash2 /></Button>
            </div>
          </article>
        ))}
        {!chosenSongs.length ? <div className="empty-state"><Trophy /><h3>No winners yet</h3><p>Promote a song from the bank when the band has decided.</p></div> : null}
      </div>
    </section>
  );
}
