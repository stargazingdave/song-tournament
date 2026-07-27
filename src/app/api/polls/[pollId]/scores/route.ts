import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

type Context = { params: { pollId: string } };

export async function PUT(request: Request, { params }: Context) {
  const { error: memberError, memberId } = requireMember();
  if (memberError) return memberError;

  const body = await parseJson<{ songId?: string; score?: number | null }>(request);
  const songId = cleanText(body.songId);

  if (!songId) return jsonError("Song is required.");

  if (body.score === null) {
    const { error } = await getSupabase()
      .from("poll_scores")
      .delete()
      .eq("poll_id", params.pollId)
      .eq("song_id", songId)
      .eq("member_id", memberId);

    if (error) return jsonError(error.message, 400);
    return NextResponse.json({ ok: true });
  }

  const score = body.score;

  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) {
    return jsonError("Score must be from 1 to 5.");
  }

  const { error } = await getSupabase().from("poll_scores").upsert(
    {
      poll_id: params.pollId,
      song_id: songId,
      member_id: memberId,
      score,
      updated_at: new Date().toISOString()
    },
    { onConflict: "poll_id,song_id,member_id" }
  );

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}
