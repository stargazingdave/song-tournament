import { NextResponse } from "next/server";
import { clearLegacyCookies } from "@/lib/auth";
import { cleanText, jsonError, parseJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await parseJson<{ email?: string; password?: string }>(request);
  const email = cleanText(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return jsonError("Enter your email and password.");
  const { error } = await (await getSupabase()).auth.signInWithPassword({ email, password });
  if (error) return jsonError(error.message, 401);
  await clearLegacyCookies();
  return NextResponse.json({ ok: true });
}
