import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { jsonError, parseJson } from "@/lib/http";
export async function POST(request: Request, { params }: { params: { bandId: string } }) {
  const { supabase, profile } = await getIdentity();
  if (!profile) return jsonError("Sign in first.", 401);
  const body = await parseJson<{ userId?: string; approve?: boolean }>(request);
  if (typeof body.approve !== "boolean" || typeof body.userId !== "string") return jsonError("Choose a request and approve or reject it.");
  const { error } = await supabase.rpc("review_join_request", {
    p_band_id: params.bandId, p_user_id: body.userId, p_approve: body.approve,
  });
  return error ? jsonError(error.message, 403) : NextResponse.json({ ok: true });
}
