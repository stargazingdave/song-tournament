import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import type { AppState, Band, SetSong, Poll, PollScore, PollSong, Song, SongVote } from "@/lib/types";

export async function GET(request: Request) {
  const { supabase, user, profile } = await getIdentity();
  const base: AppState = {
    authenticated: !!user, profile,
    suggestedDisplayName: typeof user?.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "",
    bands: [], selectedBandId: null, people: [], joinRequests: [], bandCode: null, legacyOptions: [],
    songs: [], polls: [], setSongs: [], sets: [], selectedSetId: null, canManageSets: false,
  };
  if (!user || !profile) return NextResponse.json(base);
  const [bandsResult, memberships, requests] = await Promise.all([
    supabase.from("bands").select("id,name,owner_user_id,requires_legacy_import").order("created_at"),
    supabase.from("band_members").select("band_id,state").eq("user_id", user.id),
    supabase.from("band_join_requests").select("band_id,status").eq("user_id", user.id),
  ]);
  const lookupError = bandsResult.error || memberships.error || requests.error;
  if (lookupError) return jsonError(lookupError.message, 500);
  base.bands = (bandsResult.data ?? []).map(band => ({
    ...band,
    membership_status: memberships.data?.find(m => m.band_id === band.id)?.state
      ?? (requests.data?.find(r => r.band_id === band.id)?.status === "approved" ? "removed" : requests.data?.find(r => r.band_id === band.id)?.status) ?? "pending",
  })) as Band[];
  const selected = base.bands.find(b => b.id === request.headers.get("x-band-id"))
    ?? base.bands.find(b => b.membership_status === "active") ?? base.bands[0];
  if (!selected) return NextResponse.json(base);
  const bandId = selected.id;
  base.selectedBandId = bandId;
  if (["pending", "rejected", "removed"].includes(selected.membership_status)) return NextResponse.json(base);
  const people = await supabase.rpc("get_band_people", { p_band_id: bandId });
  if (people.error) return jsonError(people.error.message, 500);
  base.people = people.data ?? [];
  if (selected.owner_user_id === user.id) {
    const [code, pending] = await Promise.all([
      supabase.from("band_codes").select("code").eq("band_id", bandId).single(),
      supabase.rpc("get_band_requests", { p_band_id: bandId }),
    ]);
    if (code.error || pending.error) return jsonError((code.error || pending.error)!.message, 500);
    base.bandCode = code.data?.code ?? null;
    base.joinRequests = pending.data ?? [];
  }
  if (selected.membership_status === "migration_required") {
    const options = await supabase.rpc("get_legacy_import_options", { p_band_id: bandId });
    if (options.error) return jsonError(options.error.message, 500);
    base.legacyOptions = options.data ?? [];
    return NextResponse.json(base);
  }

  const mine=base.people.find(person=>person.user_id===user.id);
  const isOwner=selected.owner_user_id===user.id;
  base.canManageSets=isOwner || !!mine?.can_manage_sets;
  const sets=await supabase.from("sets").select("id,name").eq("band_id",bandId).order("created_at");
  if(sets.error)return jsonError(sets.error.message,500);
  base.sets=sets.data??[];
  base.selectedSetId=base.sets.find(set=>set.id===request.headers.get("x-set-id"))?.id ?? base.sets[0]?.id ?? null;
  const results = await Promise.all([
    supabase.from("songs").select("*").eq("band_id",bandId).order("created_at",{ascending:false}),
    supabase.from("song_votes").select("song_id,user_id,vote").eq("band_id",bandId),
    supabase.from("polls").select("*").eq("band_id",bandId).order("created_at",{ascending:false}),
    supabase.from("poll_songs").select("*").eq("band_id",bandId).order("position"),
    supabase.from("poll_scores").select("poll_id,song_id,user_id,score").eq("band_id",bandId),
    supabase.from("set_songs").select("*").eq("band_id",bandId).eq("set_id",base.selectedSetId??"00000000-0000-0000-0000-000000000000").order("position"),
  ]);
  const failure = results.find(result => result.error)?.error;
  if(failure) return jsonError(failure.message,500);
  const songs = (results[0].data ?? []) as Song[];
  const votes = (results[1].data ?? []) as SongVote[];
  const polls = (results[2].data ?? []) as Poll[];
  const pollSongs = (results[3].data ?? []) as PollSong[];
  const scores = (results[4].data ?? []) as PollScore[];
  const chosen = (results[5].data ?? []) as SetSong[];
  const names = new Map(base.people.map(person => [person.user_id,person.display_name]));
  const songMap = new Map(songs.map(song => [song.id,song]));
  base.songs = songs.map(song => {
    const songVotes=votes.filter(v=>v.song_id===song.id);
    return {...song, can_manage:isOwner || song.added_by_user_id===user.id || !!mine?.can_manage_others_songs, added_by_name:(song.added_by_user_id ? names.get(song.added_by_user_id) : null) ?? song.added_by_name_snapshot,
      yes_count:songVotes.filter(v=>v.vote==="yes").length,no_count:songVotes.filter(v=>v.vote==="no").length,
      current_user_vote:songVotes.find(v=>v.user_id===user.id)?.vote ?? null,is_in_set:chosen.some(c=>c.song_id===song.id)};
  });
  base.polls=polls.map(poll=>({...poll,can_manage:isOwner || poll.created_by_user_id===user.id || !!mine?.can_manage_others_polls,songs:pollSongs.filter(ps=>ps.poll_id===poll.id).filter(ps=>songMap.has(ps.song_id)).map(ps=>{
    const entries=scores.filter(score=>score.poll_id===poll.id && score.song_id===ps.song_id);
    return {poll_song_id:ps.id,song:songMap.get(ps.song_id)!,average_score:entries.length ? entries.reduce((sum,entry)=>sum+entry.score,0)/entries.length : null,
      score_count:entries.length,current_user_score:entries.find(entry=>entry.user_id===user.id)?.score ?? null};
  })}));
  base.setSongs=chosen.filter(c=>songMap.has(c.song_id)).map(c=>({...c,song:songMap.get(c.song_id)!}));
  return NextResponse.json(base);
}
