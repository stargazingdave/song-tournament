import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
export async function POST(request: Request) {
  const { supabase, profile } = await getIdentity();
  if (!profile) return jsonError("Set up your profile first.", 403);
  const body = await parseJson<{ name?: string }>(request);
  const { data, error } = await supabase.rpc("create_band", { p_name: cleanText(body.name) });
  return error ? jsonError(error.message) : NextResponse.json({ bandId: data });
}
