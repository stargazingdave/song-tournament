import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
type Context = { params: { bandId: string } };
export async function DELETE(request: Request, { params }: Context) {
  const { supabase, profile } = await getIdentity();
  if (!profile) return jsonError("Sign in first.", 401);
  const body = await parseJson<{ userId?: string }>(request);
  if (typeof body.userId !== "string") return jsonError("Choose a user.");
  const { error } = await supabase.rpc("remove_band_member", { p_band_id: params.bandId, p_user_id: body.userId });
  return error ? jsonError(error.message, 403) : NextResponse.json({ ok: true });
}
export async function PATCH(request: Request, { params }: Context) {
  const { supabase, profile } = await getIdentity();
  if (!profile) return jsonError("Sign in first.", 401);
  const body = await parseJson<{ userId?: string; songs?: boolean; polls?: boolean; sets?: boolean }>(request);
  if (typeof body.userId !== "string" || [body.songs,body.polls,body.sets].some(v => typeof v !== "boolean")) return jsonError("Specify a user and all three permissions.");
  const { error } = await supabase.rpc("set_member_permissions", {
    p_band_id: params.bandId, p_user_id: body.userId, p_songs: body.songs, p_polls: body.polls, p_sets: body.sets,
  });
  return error ? jsonError(error.message, 403) : NextResponse.json({ ok: true });
}
