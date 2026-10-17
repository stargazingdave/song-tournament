import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { jsonError, parseJson, cleanText } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
type Context = { params: Promise<{ pollId: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const { error: accessError, bandId } = await requireBand(request);
  if (accessError) return accessError;
  const body = await parseJson<{ title?: string; songIds?: string[] }>(request);
  const { data, error } = await (await getSupabase()).rpc("save_poll", {
    p_band_id: bandId, p_poll_id: (await params).pollId, p_title: cleanText(body.title), p_song_ids: body.songIds ?? [],
  });
  return error ? jsonError(error.message, error.code === "42501" ? 403 : 400) : NextResponse.json({ pollId: data });
}
export async function DELETE(request: Request, { params }: Context) {
  const { error: accessError, bandId } = await requireBand(request);
  if (accessError) return accessError;
  const { data, error } = await (await getSupabase()).from("polls").delete().eq("band_id",bandId).eq("id",(await params).pollId).select("id").maybeSingle();
  return error || !data ? jsonError(error?.message ?? "You cannot delete this poll.",403) : NextResponse.json({ ok:true });
}
