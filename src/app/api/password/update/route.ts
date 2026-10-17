import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { jsonError, parseJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await parseJson<{ password?: string }>(request);
  if (typeof body.password !== "string" || body.password.length < 8) return jsonError("Use at least 8 characters.");
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonError("Open the password reset link from your email first.", 401);
  const { error } = await supabase.auth.updateUser({ password: body.password });
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
