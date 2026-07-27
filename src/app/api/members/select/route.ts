import { NextResponse } from "next/server";
import { clearMemberCookie, requireAuth, setMemberCookie } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const authError = requireAuth();
  if (authError) return authError;

  const body = await parseJson<{ memberId?: string }>(request);
  const memberId = cleanText(body.memberId);

  if (!memberId) {
    clearMemberCookie();
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await getSupabase()
    .from("members")
    .select("id")
    .eq("id", memberId)
    .single();

  if (error || !data) return jsonError("Member not found.", 404);

  setMemberCookie(memberId);
  return NextResponse.json({ ok: true });
}
