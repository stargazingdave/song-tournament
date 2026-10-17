import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
import type { VoteValue } from "@/lib/types";

type Context = { params: { songId: string } };

export async function PUT(request: Request, { params }: Context) {
  const { error: memberError, memberId } = await requireMember();
  if (memberError) return memberError;

  const body = await parseJson<{ vote?: VoteValue | null }>(request);

  if (body.vote === null) {
    const { error } = await getSupabase()
      .from("song_votes")
      .delete()
      .eq("song_id", params.songId)
      .eq("member_id", memberId);

    if (error) return jsonError(error.message, 400);
    return NextResponse.json({ ok: true });
  }

  if (body.vote !== "yes" && body.vote !== "no") return jsonError("Vote must be yes or no.");

  const { error } = await getSupabase().from("song_votes").upsert(
    {
      song_id: params.songId,
      member_id: memberId,
      vote: body.vote,
      updated_at: new Date().toISOString()
    },
    { onConflict: "song_id,member_id" }
  );

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}
