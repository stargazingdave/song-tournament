import { useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp, Plus, ListMusic, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppState } from "@/lib/types";
type Props = {
  state: AppState; availableSongs: AppState["songs"]; songId: string; note: string; busy: boolean;
  onSongIdChange:(value:string)=>void; onNoteChange:(value:string)=>void;
  onAdd:(event:FormEvent)=>void; onMove:(id:string,direction:-1|1)=>void; onDelete:(id:string)=>void;
  onSelect:(id:string)=>void; onCreate:(name:string)=>Promise<boolean>; onRename:(name:string)=>Promise<boolean>; onDeleteSet:()=>Promise<boolean>;
};
export function SetsPanel(props:Props){
  const [newName,setNewName]=useState("");
  const [rename,setRename]=useState("");
  const [deleteOpen,setDeleteOpen]=useState(false);
  const [deleteName,setDeleteName]=useState("");
  const set=props.state.sets.find(s=>s.id===props.state.selectedSetId);
  const manage=props.state.canManageSets;
  return <section className="section-block winners-panel">
    <div className="section-heading winners-heading"><div><p className="eyebrow">Sets</p><h2>Your band’s set lists</h2><p className="section-description">Each set keeps its own song order and notes.</p></div><ListMusic aria-hidden="true"/></div>
    <label className="stack">Selected set<select aria-label="Selected set" value={set?.id??""} disabled={props.busy || !props.state.sets.length} onChange={e=>props.onSelect(e.target.value)}>
      {!props.state.sets.length && <option value="">No sets yet</option>}
      {props.state.sets.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}
    </select></label>
    {manage && <div className="set-management stack">
      <form className="band-inline-form" onSubmit={async e=>{e.preventDefault();if(await props.onCreate(newName))setNewName("");}}>
        <input aria-label="New set name" placeholder="New set name" value={newName} maxLength={100} required disabled={props.busy} onChange={e=>setNewName(e.target.value)}/>
        <Button disabled={props.busy}><Plus/>Create set</Button>
      </form>
      {set && <form className="band-inline-form" onSubmit={async e=>{e.preventDefault();if(await props.onRename(rename))setRename("");}}>
        <input aria-label="Rename selected set" placeholder="Rename selected set" value={rename} maxLength={100} required disabled={props.busy} onChange={e=>setRename(e.target.value)}/>
        <Button variant="outline" disabled={props.busy}>Rename</Button>
        <Button type="button" variant="ghost" disabled={props.busy} onClick={()=>setDeleteOpen(!deleteOpen)}>Delete set</Button>
      </form>}
      {set && deleteOpen && <form className="band-section stack" onSubmit={async e=>{e.preventDefault();if(await props.onDeleteSet()){setDeleteOpen(false);setDeleteName("");}}}>
        <p>Deleting this set permanently removes its song order and notes. The songs stay in the band’s song bank. Type <strong>{set.name}</strong> to confirm.</p>
        <input aria-label="Confirm set name" value={deleteName} onChange={e=>setDeleteName(e.target.value)} disabled={props.busy}/>
        <Button variant="destructive" disabled={props.busy || deleteName!==set.name}>Permanently delete set</Button>
      </form>}
    </div>}
    {set && <><h3 className="set-title">{set.name}</h3>
      {manage && <form className="winner-form" onSubmit={props.onAdd}>
        <select aria-label="Song to add to set" value={props.songId} onChange={e=>props.onSongIdChange(e.target.value)} disabled={props.busy || !props.availableSongs.length}>
          <option value="">Choose a song from the bank</option>
          {props.availableSongs.map(song=><option key={song.id} value={song.id}>{song.title} — {song.artist||"Unknown artist"}</option>)}
        </select>
        <input value={props.note} onChange={e=>props.onNoteChange(e.target.value)} placeholder="Optional note" disabled={props.busy}/>
        <Button disabled={props.busy || !props.songId}><Plus/>Add to set</Button>
      </form>}
      <div className="chosen-list">{props.state.setSongs.map((entry,index)=><article className="chosen-row" key={entry.id}>
        <span className="winner-number">{String(index+1).padStart(2,"0")}</span>
        <div className="winner-copy"><h3>{entry.song.title}</h3><p>{entry.song.artist||"Unknown artist"}{entry.note ? " · "+entry.note : ""}</p></div>
        {manage && <div className="chosen-actions">
          <Button variant="ghost" size="icon" onClick={()=>props.onMove(entry.id,-1)} disabled={props.busy || index===0} aria-label="Move up"><ChevronUp/></Button>
          <Button variant="ghost" size="icon" onClick={()=>props.onMove(entry.id,1)} disabled={props.busy || index===props.state.setSongs.length-1} aria-label="Move down"><ChevronDown/></Button>
          <Button variant="ghost" size="icon" onClick={()=>props.onDelete(entry.id)} disabled={props.busy} aria-label="Remove from set"><Trash2/></Button>
        </div>}
      </article>)}</div>
      {!props.state.setSongs.length && <p className="muted">This set has no songs yet.</p>}
    </>}
  </section>;
}
