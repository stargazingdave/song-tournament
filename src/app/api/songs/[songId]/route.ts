import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
import { parseYoutubeUrl } from "@/lib/youtube";

type Context = { params: { songId: string } };

export async function PATCH(request: Request, { params }: Context) {
  const { error: memberError } = await requireMember();
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

  const { data, error } = await getSupabase()
    .from("songs")
    .update({
      title,
      artist,
      youtube_url: youtube?.normalizedUrl ?? null,
      youtube_video_id: youtube?.videoId ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("id", params.songId)
    .select("*")
    .single();

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ song: data });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { error: memberError } = await requireMember();
  if (memberError) return memberError;

  const { error } = await getSupabase().from("songs").delete().eq("id", params.songId);
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}
