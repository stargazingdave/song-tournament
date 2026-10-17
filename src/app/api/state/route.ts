import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import type { AppState, ChosenSong, Member, Poll, PollScore, PollSong, Song, SongVote } from "@/lib/types";

export async function GET() {
  const { supabase, user, memberId } = await getIdentity();
  if (!user || !memberId) {
    return NextResponse.json({
      authenticated: !!user,
      selectedMemberId: null,
      members: [],
      songs: [],
      polls: [],
      chosenSongs: []
    } satisfies AppState);
  }

  const [
    membersResult,
    songsResult,
    songVotesResult,
    pollsResult,
    pollSongsResult,
    pollScoresResult,
    chosenSongsResult
  ] = await Promise.all([
    supabase.from("members").select("*").order("name"),
    supabase.from("songs").select("*").order("created_at", { ascending: false }),
    supabase.from("song_votes").select("*"),
    supabase.from("polls").select("*").order("created_at", { ascending: false }),
    supabase.from("poll_songs").select("*").order("position"),
    supabase.from("poll_scores").select("*"),
    supabase.from("chosen_songs").select("*").order("position")
  ]);

  const failure = [
    membersResult.error,
    songsResult.error,
    songVotesResult.error,
    pollsResult.error,
    pollSongsResult.error,
    pollScoresResult.error,
    chosenSongsResult.error
  ].find(Boolean);

  if (failure) return jsonError(failure.message, 500);

  const members = (membersResult.data ?? []) as Member[];
  const songs = (songsResult.data ?? []) as Song[];
  const votes = (songVotesResult.data ?? []) as SongVote[];
  const polls = (pollsResult.data ?? []) as Poll[];
  const pollSongs = (pollSongsResult.data ?? []) as PollSong[];
  const pollScores = (pollScoresResult.data ?? []) as PollScore[];
  const chosenSongs = (chosenSongsResult.data ?? []) as ChosenSong[];

  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  const chosenSongIds = new Set(chosenSongs.map((chosen) => chosen.song_id));
  const songMap = new Map(songs.map((song) => [song.id, song]));

  const songsWithVotes = songs.map((song) => {
    const songVotes = votes.filter((vote) => vote.song_id === song.id);

    return {
      ...song,
      added_by_name: song.added_by_member_id ? memberNames.get(song.added_by_member_id) ?? null : null,
      yes_count: songVotes.filter((vote) => vote.vote === "yes").length,
      no_count: songVotes.filter((vote) => vote.vote === "no").length,
      current_member_vote: memberId ? songVotes.find((vote) => vote.member_id === memberId)?.vote ?? null : null,
      is_chosen: chosenSongIds.has(song.id)
    };
  });

  const pollsWithSongs = polls.map((poll) => ({
    ...poll,
    songs: pollSongs
      .filter((pollSong) => pollSong.poll_id === poll.id)
      .map((pollSong) => {
        const scores = pollScores.filter(
          (score) => score.poll_id === poll.id && score.song_id === pollSong.song_id
        );
        const total = scores.reduce((sum, score) => sum + score.score, 0);

        return {
          poll_song_id: pollSong.id,
          song: songMap.get(pollSong.song_id)!,
          average_score: scores.length ? total / scores.length : null,
          score_count: scores.length,
          current_member_score: memberId
            ? scores.find((score) => score.member_id === memberId)?.score ?? null
            : null
        };
      })
      .filter((entry) => Boolean(entry.song))
  }));

  const chosenWithSongs = chosenSongs
    .map((chosen) => {
      const song = songMap.get(chosen.song_id);
      return song ? { ...chosen, song } : null;
    })
    .filter((chosen): chosen is ChosenSong & { song: Song } => chosen !== null);

  return NextResponse.json({
    authenticated: true,
    selectedMemberId: memberId,
    members,
    songs: songsWithVotes,
    polls: pollsWithSongs,
    chosenSongs: chosenWithSongs
  } satisfies AppState);
}
