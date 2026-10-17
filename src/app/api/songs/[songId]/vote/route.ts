import { NextResponse } from "next/server";
import { requireBand } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
import type { VoteValue } from "@/lib/types";

type Context = { params: Promise<{ songId: string }> };

export async function PUT(request: Request, { params }: Context) {
  const { error: memberError, bandId, userId } = await requireBand(request);
  if (memberError) return memberError;

  const body = await parseJson<{ vote?: VoteValue | null }>(request);

  if (body.vote === null) {
    const { error } = await (await getSupabase())
      .from("song_votes")
      .delete()
      .eq("band_id", bandId).eq("song_id", (await params).songId)
      .eq("user_id", userId);

    if (error) return jsonError(error.message, 400);
    return NextResponse.json({ ok: true });
  }

  if (body.vote !== "yes" && body.vote !== "no") return jsonError("Vote must be yes or no.");

  const { error } = await (await getSupabase()).from("song_votes").upsert(
    {
      band_id: bandId,
      song_id: (await params).songId,
      user_id: userId,
      vote: body.vote,
      updated_at: new Date().toISOString()
    },
    { onConflict: "song_id,user_id" }
  );

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}
