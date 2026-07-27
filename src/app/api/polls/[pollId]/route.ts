import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

type Context = { params: { pollId: string } };

export async function PATCH(request: Request, { params }: Context) {
  const { error: memberError } = requireMember();
  if (memberError) return memberError;

  const body = await parseJson<{ title?: string; songIds?: string[] }>(request);
  const title = cleanText(body.title);
  const songIds = Array.isArray(body.songIds) ? body.songIds.filter(Boolean) : [];

  if (!title) return jsonError("Poll title is required.");
  if (!songIds.length) return jsonError("Choose at least one song for the poll.");

  const supabase = getSupabase();
  const { error } = await supabase
    .from("polls")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", params.pollId);

  if (error) return jsonError(error.message, 400);

  const { data: existingRows, error: existingError } = await supabase
    .from("poll_songs")
    .select("song_id")
    .eq("poll_id", params.pollId);

  if (existingError) return jsonError(existingError.message, 400);

  const existingSongIds = new Set((existingRows ?? []).map((row) => row.song_id as string));
  const nextSongIds = new Set(songIds);
  const removeSongIds = [...existingSongIds].filter((songId) => !nextSongIds.has(songId));
  const addSongIds = songIds.filter((songId) => !existingSongIds.has(songId));

  if (removeSongIds.length) {
    const { error: removeError } = await supabase
      .from("poll_songs")
      .delete()
      .eq("poll_id", params.pollId)
      .in("song_id", removeSongIds);

    if (removeError) return jsonError(removeError.message, 400);
  }

  if (addSongIds.length) {
    const { error: addError } = await supabase.from("poll_songs").insert(
      addSongIds.map((songId) => ({
        poll_id: params.pollId,
        song_id: songId,
        position: songIds.indexOf(songId)
      }))
    );

    if (addError) return jsonError(addError.message, 400);
  }

  const { data: currentRows, error: currentError } = await supabase
    .from("poll_songs")
    .select("id,song_id")
    .eq("poll_id", params.pollId);

  if (currentError) return jsonError(currentError.message, 400);

  await Promise.all(
    (currentRows ?? []).map((row) =>
      supabase
        .from("poll_songs")
        .update({ position: songIds.indexOf(row.song_id as string) })
        .eq("id", row.id as string)
    )
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { error: memberError } = requireMember();
  if (memberError) return memberError;

  const { error } = await getSupabase().from("polls").delete().eq("id", params.pollId);
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}
