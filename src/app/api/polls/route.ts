import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const { error: memberError } = requireMember();
  if (memberError) return memberError;

  const body = await parseJson<{ title?: string; songIds?: string[] }>(request);
  const title = cleanText(body.title);
  const songIds = Array.isArray(body.songIds) ? body.songIds.filter(Boolean) : [];

  if (!title) return jsonError("Poll title is required.");
  if (!songIds.length) return jsonError("Choose at least one song for the poll.");

  const supabase = getSupabase();
  const { data: poll, error } = await supabase.from("polls").insert({ title }).select("*").single();

  if (error) return jsonError(error.message, 400);

  const { error: songsError } = await supabase.from("poll_songs").insert(
    songIds.map((songId, index) => ({
      poll_id: poll.id,
      song_id: songId,
      position: index
    }))
  );

  if (songsError) return jsonError(songsError.message, 400);

  return NextResponse.json({ poll });
}
