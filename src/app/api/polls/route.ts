import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { jsonError, parseJson, cleanText } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
export async function POST(request: Request) {
  const { error: accessError, bandId } = await requireBand(request);
  if (accessError) return accessError;
  const body = await parseJson<{ title?: string; songIds?: string[] }>(request);
  const { data, error } = await getSupabase().rpc("save_poll", {
    p_band_id: bandId, p_poll_id: null, p_title: cleanText(body.title), p_song_ids: body.songIds ?? [],
  });
  return error ? jsonError(error.message, error.code === "42501" ? 403 : 400) : NextResponse.json({ pollId: data });
}
