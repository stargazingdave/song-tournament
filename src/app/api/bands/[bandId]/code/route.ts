import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { jsonError } from "@/lib/http";
export async function POST(_request: Request, { params }: { params: Promise<{ bandId: string }> }) {
  const { supabase, profile } = await getIdentity();
  if (!profile) return jsonError("Sign in first.", 401);
  const { data, error } = await supabase.rpc("rotate_band_code", { p_band_id: (await params).bandId });
  return error ? jsonError(error.message, 403) : NextResponse.json({ code: data });
}
