import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
import { parseYoutubeUrl } from "@/lib/youtube";

type Context = { params: Promise<{ songId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { error: memberError, bandId } = await requireBand(request);
  if (memberError) return memberError;

  const body = await parseJson<{ title?: string; artist?: string; youtubeUrl?: string }>(request);
  const title = cleanText(body.title);
  const artist = cleanText(body.artist) || null;
  const youtubeUrl = cleanText(body.youtubeUrl);

  if (!title) return jsonError("Song title is required.");

  let youtube: ReturnType<typeof parseYoutubeUrl> | null = null;
  if (youtubeUrl) {
    try {
      youtube = parseYoutubeUrl(youtubeUrl);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Invalid YouTube link.");
    }
  }

  const { data, error } = await (await getSupabase())
    .from("songs")
    .update({
      title,
      artist,
      youtube_url: youtube?.normalizedUrl ?? null,
      youtube_video_id: youtube?.videoId ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("band_id", bandId).eq("id", (await params).songId)
    .select("*")
    .maybeSingle();

  if (error || !data) return jsonError(error?.message ?? "You cannot manage this song.", 403);

  return NextResponse.json({ song: data });
}

export async function DELETE(request: Request, { params }: Context) {
  const { error: memberError, bandId } = await requireBand(request);
  if (memberError) return memberError;

  const { data, error } = await (await getSupabase()).from("songs").delete().eq("band_id", bandId).eq("id", (await params).songId).select("id").maybeSingle();
  if (error || !data) return jsonError(error?.message ?? "You cannot delete this song.", 403);

  return NextResponse.json({ ok: true });
}
