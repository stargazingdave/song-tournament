import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { error: memberError } = await requireMember();
  if (memberError) return memberError;

  const body = await parseJson<{ songId?: string; note?: string }>(request);
  const songId = cleanText(body.songId);
  const note = cleanText(body.note) || null;

  if (!songId) return jsonError("Choose a song from the bank.");

  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from("chosen_songs")
    .select("id", { count: "exact", head: true });

  if (countError) return jsonError(countError.message, 400);

  const { data, error } = await supabase
    .from("chosen_songs")
    .insert({ song_id: songId, note, position: count ?? 0 })
    .select("*")
    .single();

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ chosenSong: data });
}
