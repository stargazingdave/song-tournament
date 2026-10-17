import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
export async function POST(request: Request, { params }: { params: { bandId: string } }) {
  const { supabase, profile } = await getIdentity();
  if (!profile) return jsonError("Sign in first.", 401);
  const body = await parseJson<{ memberId?: string; confirmed?: boolean }>(request);
  if (typeof body.memberId !== "string" || body.confirmed !== true) return jsonError("Select a legacy member and confirm the permanent migration.");
  const { error } = await supabase.rpc("complete_legacy_import", {
    p_band_id: params.bandId, p_member_id: body.memberId, p_confirm: body.confirmed,
  });
  return error ? jsonError(error.message, 409) : NextResponse.json({ ok: true });
}
