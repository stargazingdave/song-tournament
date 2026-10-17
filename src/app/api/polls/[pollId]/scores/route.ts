import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

type Context = { params: Promise<{ pollId: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { error: memberError, bandId, userId } = await requireBand(request);
  if (memberError) return memberError;

  const body = await parseJson<{ songId?: string; score?: number | null }>(request);
  const songId = cleanText(body.songId);

  if (!songId) return jsonError("Song is required.");

  if (body.score === null) {
    const { error } = await (await getSupabase())
      .from("poll_scores")
      .delete()
      .eq("band_id", bandId).eq("poll_id", (await params).pollId)
      .eq("song_id", songId)
      .eq("user_id", userId);

    if (error) return jsonError(error.message, 400);
    return NextResponse.json({ ok: true });
  }

  const score = body.score;

  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) {
    return jsonError("Score must be from 1 to 5.");
  }

  const { error } = await (await getSupabase()).from("poll_scores").upsert(
    {
      band_id: bandId,
      poll_id: (await params).pollId,
      song_id: songId,
      user_id: userId,
      score,
      updated_at: new Date().toISOString()
    },
    { onConflict: "poll_id,song_id,user_id" }
  );

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}
