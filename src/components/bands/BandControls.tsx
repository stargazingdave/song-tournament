"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/client-api";
import type { AppState } from "@/lib/types";

type Props = { state: AppState; busy: boolean; error: string; onSelect: (id: string) => Promise<void>;
  run: (action: () => Promise<void>) => Promise<boolean>; onLogout: () => void };
export function BandControls({ state, busy, error, onSelect, run, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  return <>
    <label className="band-switcher">Band
      <select aria-label="Current band" value={state.selectedBandId ?? ""} onChange={e => void onSelect(e.target.value)} disabled={busy}>
        {!state.bands.length && <option value="">No bands yet</option>}
        {state.bands.map(band => <option key={band.id} value={band.id}>{band.name}{band.membership_status !== "active" ? " · " + band.membership_status.replaceAll("_"," ") : ""}</option>)}
      </select>
    </label>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Bands</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="band-dialog">
        <DialogHeader><DialogTitle>Your bands</DialogTitle><DialogDescription>Create a band, request access, or manage the selected band.</DialogDescription></DialogHeader>
        <BandDashboard state={state} busy={busy} error={error} onSelect={onSelect} run={run} onLogout={onLogout} />
      </DialogContent>
    </Dialog>
  </>;
}

export function BandDashboard({ state, busy, error, run, onSelect }: Props) {
  const [bandName,setBandName]=useState("");
  const [code,setCode]=useState("");
  const [rename,setRename]=useState("");
  const [copyMessage,setCopyMessage]=useState("");
  const [legacyId,setLegacyId]=useState("");
  const [confirmed,setConfirmed]=useState(false);
  const [deleteName,setDeleteName]=useState("");
  const [deleteConfirmed,setDeleteConfirmed]=useState(false);
  const selected=state.bands.find(b=>b.id===state.selectedBandId);
  const owner=selected?.owner_user_id===state.profile?.user_id;
  async function create(event:FormEvent) {
    event.preventDefault();
    await run(async()=>{const result=await api<{bandId:string}>("/api/bands",{method:"POST",body:JSON.stringify({name:bandName})});setBandName("");await onSelect(result.bandId);});
  }
  async function join(event:FormEvent) {
    event.preventDefault();
    await run(async()=>{const result=await api<{bandId:string}>("/api/bands/join",{method:"POST",body:JSON.stringify({code})});setCode("");await onSelect(result.bandId);});
  }
  return <div className="band-dashboard">
    {error && <p role="alert" className="error">{error}</p>}
    {selected?.membership_status==="pending" && <section className="band-section"><h2>Waiting for approval</h2><p>Your request to join {selected.name} is waiting for the band owner. Refresh to check for a response.</p><Button variant="outline" disabled={busy} onClick={()=>void run(async()=>{})}>Refresh status</Button></section>}
    {selected?.membership_status==="rejected" && <section className="band-section"><h2>Request declined</h2><p>The owner declined your request to join {selected.name}. You can request again using the current code.</p></section>}
    {selected?.membership_status==="removed" && <section className="band-section"><h2>Membership ended</h2><p>You no longer have access to {selected.name}. Request access again with its current band code if you want to rejoin.</p></section>}
    {selected?.membership_status==="migration_required" && <form className="band-section auth-form stack" onSubmit={event=>{
      event.preventDefault();void run(async()=>{await api("/api/bands/"+selected.id+"/import",{method:"POST",body:JSON.stringify({memberId:legacyId,confirmed})});setLegacyId("");setConfirmed(false);});
    }}>
      <h2>Bring your existing data into {selected.name}</h2>
      <p>The owner has approved your request. Choose your old member profile before entering this band.</p>
      <label>Existing member<select required value={legacyId} disabled={busy} onChange={e=>{setLegacyId(e.target.value);setConfirmed(false);}}>
        <option value="" disabled>Select your existing member</option>
        {state.legacyOptions.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}
      </select></label>
      <p className="migration-warning" role="note">This decision is permanent and final. The selected member’s votes, scores, and song attribution will move to your account. Their old member record will be deleted and will no longer be available to anyone else.</p>
      <label className="checkbox-label"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>I understand that this choice is permanent and final.</label>
      <Button disabled={busy || !legacyId || !confirmed}>Confirm permanent migration and enter band</Button>
    </form>}
    {selected && selected.membership_status==="active" && <section className="band-section stack">
      <h2>{selected.name}</h2>
      {owner && <><p>You own this band. Only you can approve requests and manage its code.</p>
        <label className="stack">Band code<input aria-label="Band code" readOnly value={state.bandCode ?? ""}/></label>
        <div className="form-actions">
          <Button variant="outline" disabled={!state.bandCode} onClick={async()=>{try{await navigator.clipboard.writeText(state.bandCode!);setCopyMessage("Copied band code");}catch{setCopyMessage("Select the code above and copy it.");}}}>Copy code</Button>
          <Button variant="outline" disabled={busy} onClick={()=>void run(async()=>{await api("/api/bands/"+selected.id+"/code",{method:"POST",body:"{}"});setCopyMessage("Code rotated. The previous code no longer works.");})}>Generate new code</Button>
        </div>
        {copyMessage && <p role="status">{copyMessage}</p>}
        <form className="band-inline-form" onSubmit={event=>{event.preventDefault();void run(async()=>{await api("/api/bands/"+selected.id,{method:"PATCH",body:JSON.stringify({name:rename})});setRename("");});}}>
          <input aria-label="New band name" placeholder="New band name" value={rename} maxLength={100} required disabled={busy} onChange={e=>setRename(e.target.value)}/>
          <Button variant="outline" disabled={busy}>Rename</Button>
        </form>
        <h3>Join requests</h3>
        {!state.joinRequests.length && <p className="muted">No pending requests.</p>}
        {state.joinRequests.map(request=><div className="band-person" key={request.user_id}>
          <span>{request.display_name}</span><div className="form-actions">
            <Button disabled={busy} onClick={()=>void run(async()=>{await api("/api/bands/"+selected.id+"/requests",{method:"POST",body:JSON.stringify({userId:request.user_id,approve:true})});})}>Approve</Button>
            <Button variant="outline" disabled={busy} onClick={()=>void run(async()=>{await api("/api/bands/"+selected.id+"/requests",{method:"POST",body:JSON.stringify({userId:request.user_id,approve:false})});})}>Decline</Button>
          </div>
        </div>)}
      </>}
      <h3>Members</h3>
      {state.people.map(person=><div className="band-person" key={person.user_id}>
        <span>{person.display_name}{person.user_id===selected.owner_user_id ? " · Owner" : person.state==="migration_required" ? " · Migration required" : ""}</span>
        {owner && person.user_id!==selected.owner_user_id && <Button variant="outline" disabled={busy} onClick={()=>void run(async()=>{await api("/api/bands/"+selected.id+"/people",{method:"DELETE",body:JSON.stringify({userId:person.user_id})});})}>Remove</Button>}
        {owner && person.user_id!==selected.owner_user_id && <fieldset className="member-permissions"><legend>Additional permissions for {person.display_name}</legend>
          {([['songs','Manage others’ songs',person.can_manage_others_songs],['polls','Manage others’ polls',person.can_manage_others_polls],['sets','Manage sets',person.can_manage_sets]] as const).map(([key,label,value])=><label className="checkbox-label" key={key}>
            <input type="checkbox" checked={value} disabled={busy} onChange={e=>void run(async()=>{await api("/api/bands/"+selected.id+"/people",{method:"PATCH",body:JSON.stringify({userId:person.user_id,songs:person.can_manage_others_songs,polls:person.can_manage_others_polls,sets:person.can_manage_sets,[key]:e.target.checked})});})}/>{label}
          </label>)}
        </fieldset>}
      </div>)}
      {!owner && <Button variant="outline" disabled={busy} onClick={()=>void run(async()=>{await api("/api/bands/"+selected.id+"/people",{method:"DELETE",body:JSON.stringify({userId:state.profile!.user_id})});})}>Leave band</Button>}
      {owner && <form className="band-section stack auth-form" onSubmit={event=>{event.preventDefault();void run(async()=>{await api("/api/bands/"+selected.id,{method:"DELETE",body:JSON.stringify({confirmationName:deleteName,confirmed:deleteConfirmed})});});}}>
        <h3>Delete band</h3><p>This permanently deletes this band, its songs, polls, sets, votes, and pending requests. Your account and other bands stay intact. Type the band name to confirm.</p>
        <input aria-label="Confirm band name" value={deleteName} onChange={e=>setDeleteName(e.target.value)} disabled={busy}/>
        <label className="checkbox-label"><input type="checkbox" checked={deleteConfirmed} onChange={e=>setDeleteConfirmed(e.target.checked)} disabled={busy}/>I understand this deletion is permanent.</label>
        <Button variant="destructive" disabled={busy || !deleteConfirmed || deleteName!==selected.name}>Permanently delete band</Button>
      </form>}
    </section>}
    <div className="band-forms">
      <form className="band-section stack auth-form" onSubmit={create}><h2>Create a band</h2>
        <label>Band name<input value={bandName} required maxLength={100} disabled={busy} onChange={e=>setBandName(e.target.value)}/></label>
        <Button disabled={busy}>Create band</Button>
      </form>
      <form className="band-section stack auth-form" onSubmit={join}><h2>Request to join a band</h2>
        <p>Get a code from the owner. You can enter after they approve your request.</p>
        <label>Band code<input value={code} required autoComplete="off" disabled={busy} onChange={e=>setCode(e.target.value)}/></label>
        <Button disabled={busy}>Send join request</Button>
      </form>
    </div>
  </div>;
}
