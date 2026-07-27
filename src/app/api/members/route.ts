import { NextResponse } from "next/server";
import { requireAuth, setMemberCookie } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const authError = requireAuth();
  if (authError) return authError;

  const body = await parseJson<{ name?: string }>(request);
  const name = cleanText(body.name);

  if (!name) return jsonError("Member name is required.");

  const { data, error } = await getSupabase()
    .from("members")
    .insert({ name })
    .select("*")
    .single();

  if (error) return jsonError(error.message, 400);

  setMemberCookie(data.id);
  return NextResponse.json({ member: data });
}
