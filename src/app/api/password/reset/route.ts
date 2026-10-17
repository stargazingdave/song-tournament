import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { cleanText, jsonError, parseJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = await parseJson<{ email?: string }>(request);
  const email = cleanText(body.email);
  if (!email) return jsonError("Enter your email.");
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: new URL("/auth/confirm?next=/auth/update-password", request.url).toString(),
  });
  if (error) return jsonError(error.message);
  return NextResponse.json({ ok: true });
}
