import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

type Context = { params: { chosenId: string } };

export async function PATCH(request: Request, { params }: Context) {
  const { error: memberError } = await requireMember();
  if (memberError) return memberError;

  const body = await parseJson<{ note?: string }>(request);
  const note = cleanText(body.note) || null;

  const { data, error } = await getSupabase()
    .from("chosen_songs")
    .update({ note, updated_at: new Date().toISOString() })
    .eq("id", params.chosenId)
    .select("*")
    .single();

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ chosenSong: data });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { error: memberError } = await requireMember();
  if (memberError) return memberError;

  const { error } = await getSupabase().from("chosen_songs").delete().eq("id", params.chosenId);
  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}
