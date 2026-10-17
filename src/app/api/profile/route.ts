import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
export async function POST(request: Request) {
  const { supabase, user } = await getIdentity();
  if (!user) return jsonError("Sign in first.", 401);
  const body = await parseJson<{ displayName?: string }>(request);
  const { error } = await supabase.rpc("enroll", { p_display_name: cleanText(body.displayName) });
  return error ? jsonError(error.message) : NextResponse.json({ ok: true });
}
