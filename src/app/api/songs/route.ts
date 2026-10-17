import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
import { parseYoutubeUrl } from "@/lib/youtube";

export async function POST(request: Request) {
  const { error: memberError, bandId, userId } = await requireBand(request);
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
    .insert({
      band_id: bandId,
      title,
      artist,
      youtube_url: youtube?.normalizedUrl ?? null,
      youtube_video_id: youtube?.videoId ?? null,
      added_by_user_id: userId
    })
    .select("*")
    .single();

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ song: data });
}
